from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from db import get_db
from models import UserProfile, User
from schemas import UserProfileCreate, UserProfileUpdate, UserProfileResponse
from auth import get_current_user

router = APIRouter()

@router.post("", response_model=UserProfileResponse)
@router.post("/", response_model=UserProfileResponse)
def create_user_profile(profile: UserProfileCreate, db: Session = Depends(get_db)):
    db_profile = UserProfile(**profile.dict())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("", response_model=List[UserProfileResponse])
@router.get("/", response_model=List[UserProfileResponse])
def list_user_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(UserProfile).offset(skip).limit(limit).all()

@router.get("/{profile_id}", response_model=UserProfileResponse)
def get_user_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile

@router.get("/user/{user_id}", response_model=UserProfileResponse)
def get_user_profile_by_user_id(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile

@router.put("/{profile_id}", response_model=UserProfileResponse)
def update_user_profile(
    profile_id: int,
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@router.put("/user/{user_id}/signature", response_model=UserProfileResponse)
async def save_user_signature(
    user_id: int,
    signature_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save or update user signature in profile. Users can update their signature in profile management."""
    # Ensure user can only update their own signature
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user's signature")
    
    # Get or create user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Create profile if it doesn't exist
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    
    # Save or update signature data (allows updates)
    profile.signature = signature_data.get("signature")
    profile.signature_signer_name = signature_data.get("signature_signer_name")
    profile.signature_date = datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/user/{user_id}/signature", response_model=UserProfileResponse)
def get_user_signature(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's saved signature."""
    # Users can only view their own signature
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's signature")
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile or not profile.signature:
        raise HTTPException(status_code=404, detail="No signature found for this user")
    
    return profile

