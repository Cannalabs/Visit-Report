"""
Database connection and session management.
All database configuration is loaded from config.py (which reads from env.conf).
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# Convert async URL to sync URL if needed
# SQLAlchemy sync operations require postgresql:// or postgresql+psycopg2://
# not postgresql+asyncpg://
database_url = str(DATABASE_URL)
if database_url.startswith("postgresql+asyncpg://"):
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql://"):
    # Ensure we use psycopg2 for sync operations
    if "+psycopg2" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Create database engine with connection pooling for better performance
# All settings come from env.conf via config.py
engine = create_engine(
    database_url,
    pool_size=10,  # Number of connections to maintain in the pool
    max_overflow=20,  # Maximum number of connections to create beyond pool_size
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=False  # Set to True for SQL query logging (useful for debugging)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

