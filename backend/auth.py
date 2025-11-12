"""
Authentication utilities: password hashing, JWT token creation, and user authentication.
"""
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from db import get_db
from models import User
import bcrypt

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a bcrypt hash.
    
    Args:
        plain_password: The plain text password to verify
        hashed_password: The bcrypt hashed password to compare against
        
    Returns:
        True if password matches, False otherwise
    """
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The bcrypt hashed password as a string
    """
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Truncate to 72 bytes if longer (bcrypt limit)
    if len(password) > 72:
        password = password[:72]
    # Generate salt and hash
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing the token payload (typically {"sub": user_email})
        expires_delta: Optional timedelta for token expiration. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str) -> User | bool:
    """
    Authenticate a user by email and password.
    
    Args:
        db: Database session
        email: User email address
        password: Plain text password
        
    Returns:
        User object if authentication succeeds, False otherwise
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        token: JWT token from Authorization header
        db: Database session
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current authenticated and active user.
    
    Args:
        current_user: Current user from get_current_user dependency
        
    Returns:
        Active User object
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user

