from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import AuditLog, User
from schemas import AuditLogCreate, AuditLogResponse
from auth import get_current_user

router = APIRouter()

@router.post("", response_model=AuditLogResponse)
@router.post("/", response_model=AuditLogResponse)
def create_audit_log(
    log: AuditLogCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_log = AuditLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("", response_model=List[AuditLogResponse])
@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    actor_user_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if actor_user_id:
        query = query.filter(AuditLog.actor_user_id == actor_user_id)
    if target_user_id:
        query = query.filter(AuditLog.target_user_id == target_user_id)
    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(
    log_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log

