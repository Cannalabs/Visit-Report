from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db import get_db
from models import UserProfile
from schemas import UserProfileCreate, UserProfileUpdate, UserProfileResponse

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

