from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import Configuration, User
from schemas import ConfigurationCreate, ConfigurationUpdate, ConfigurationResponse
from auth import get_current_user

router = APIRouter()

@router.post("", response_model=ConfigurationResponse)
@router.post("/", response_model=ConfigurationResponse)
def create_configuration(
    config: ConfigurationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_config = Configuration(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.get("", response_model=List[ConfigurationResponse])
@router.get("/", response_model=List[ConfigurationResponse])
def list_configurations(
    config_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Configuration)
    if config_type:
        query = query.filter(Configuration.config_type == config_type)
    if is_active is not None:
        query = query.filter(Configuration.is_active == is_active)
    return query.order_by(Configuration.display_order).offset(skip).limit(limit).all()

@router.get("/{config_id}", response_model=ConfigurationResponse)
def get_configuration(
    config_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config

@router.put("/{config_id}", response_model=ConfigurationResponse)
def update_configuration(
    config_id: int,
    config_update: ConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config

@router.delete("/{config_id}")
def delete_configuration(
    config_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    db.delete(config)
    db.commit()
    return {"message": "Configuration deleted successfully"}

