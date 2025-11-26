import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import ShopVisit, User, VisitStatus
from schemas import ShopVisitCreate, ShopVisitUpdate, ShopVisitResponse
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", response_model=ShopVisitResponse)
@router.post("/", response_model=ShopVisitResponse)
def create_shop_visit(
    visit: ShopVisitCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create visit with all data - use dict(exclude_unset=False) to include all fields
    visit_data = visit.dict(exclude_unset=False)
    # Set created_by to current user ID
    visit_data['created_by'] = current_user.id
    
    # Ensure all JSON fields are properly handled
    # Convert lists to ensure they're stored as JSON arrays
    if 'products_discussed' in visit_data and visit_data['products_discussed'] is None:
        visit_data['products_discussed'] = []
    if 'training_topics' in visit_data and visit_data['training_topics'] is None:
        visit_data['training_topics'] = []
    if 'support_materials_items' in visit_data and visit_data['support_materials_items'] is None:
        visit_data['support_materials_items'] = []
    if 'visit_photos' in visit_data and visit_data['visit_photos'] is None:
        visit_data['visit_photos'] = []
    # Ensure sales_data is a dict, not None
    if 'sales_data' in visit_data and visit_data['sales_data'] is None:
        visit_data['sales_data'] = {}
    
    # Create the visit with all fields
    db_visit = ShopVisit(**visit_data)
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@router.get("", response_model=List[ShopVisitResponse])
@router.get("/", response_model=List[ShopVisitResponse])
def list_shop_visits(
    customer_id: Optional[int] = None,
    is_draft: Optional[bool] = None,
    visit_status: Optional[VisitStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Optimize query: Use indexed column for ordering and limit result set
    # For large datasets, consider only loading essential fields first
    query = db.query(ShopVisit)
    if customer_id:
        query = query.filter(ShopVisit.customer_id == customer_id)
    if is_draft is not None:
        query = query.filter(ShopVisit.is_draft == is_draft)
    if visit_status is not None:
        query = query.filter(ShopVisit.visit_status == visit_status)
    # Use created_at for ordering as it's more reliable and indexed
    # visit_date can be null for appointments
    # Limit to reasonable maximum to prevent excessive data loading
    effective_limit = min(limit, 1000)  # Cap at 1000 records max
    return query.order_by(ShopVisit.created_at.desc()).offset(skip).limit(effective_limit).all()

@router.get("/{visit_id}", response_model=ShopVisitResponse)
def get_shop_visit(visit_id: int, db: Session = Depends(get_db)):
    try:
        visit = db.query(ShopVisit).filter(ShopVisit.id == visit_id).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Shop visit not found")
        
        # Ensure sales_data is a dict if it's None or not set
        # This handles cases where the column exists but is NULL
        if not hasattr(visit, 'sales_data') or visit.sales_data is None:
            visit.sales_data = {}
        
        # Refresh to ensure all fields are loaded
        db.refresh(visit)
        
        return visit
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        error_msg = f"Error getting shop visit {visit_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        # Return 500 with CORS headers by raising HTTPException
        raise HTTPException(status_code=500, detail=error_msg)

@router.put("/{visit_id}", response_model=ShopVisitResponse)
def update_shop_visit(
    visit_id: int,
    visit_update: ShopVisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        visit = db.query(ShopVisit).filter(ShopVisit.id == visit_id).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Shop visit not found")
        
        # Get update data to check what fields are being updated
        update_data = visit_update.dict(exclude_unset=True)
        
        # Define follow-up fields that can be edited even when status is "done"
        follow_up_fields = {'follow_up_notes', 'follow_up_assigned_user_id', 'follow_up_stage', 'follow_up_date'}
        
        # Check if update only contains follow-up fields
        is_only_follow_up_update = update_data.keys() <= follow_up_fields
        
        # Prevent editing if status is "done" (unless only updating follow-up fields or status itself)
        current_status = visit.visit_status or VisitStatus.draft
        if current_status == VisitStatus.done:
            # Allow follow-up field updates if user is creator or assigned user
            if is_only_follow_up_update:
                is_creator = visit.created_by == current_user.id
                is_assigned = visit.follow_up_assigned_user_id == current_user.id
                if not (is_creator or is_assigned):
                    raise HTTPException(
                        status_code=403,
                        detail="Only the creator or assigned user can update follow-up fields for completed visits."
                    )
            # Allow status change from "done" to other statuses (for admin/manager override)
            elif 'visit_status' not in update_data or update_data.get('visit_status') == VisitStatus.done:
                raise HTTPException(
                    status_code=403, 
                    detail="Cannot edit visit report with status 'done'. Change status first to allow editing."
                )
        
        # Ensure JSON fields are properly handled
        if 'products_discussed' in update_data and update_data['products_discussed'] is None:
            update_data['products_discussed'] = []
        if 'training_topics' in update_data and update_data['training_topics'] is None:
            update_data['training_topics'] = []
        if 'support_materials_items' in update_data and update_data['support_materials_items'] is None:
            update_data['support_materials_items'] = []
        if 'visit_photos' in update_data and update_data['visit_photos'] is None:
            update_data['visit_photos'] = []
        # Ensure sales_data is a dict, not None
        if 'sales_data' in update_data and update_data['sales_data'] is None:
            update_data['sales_data'] = {}
        
        # Update only the fields that are provided
        for field, value in update_data.items():
            # Skip fields that shouldn't be updated via this endpoint
            if field in ['id', 'created_at', 'created_by']:
                continue
            # Handle None values for optional fields
            if value is None and field in ['draft_saved_at', 'signature_date', 'gps_coordinates', 'signature', 'signature_signer_name', 'follow_up_notes', 'follow_up_assigned_user_id', 'follow_up_stage', 'follow_up_date']:
                setattr(visit, field, None)
            else:
                setattr(visit, field, value)
        
        # Update updated_at timestamp
        from datetime import datetime, timezone
        visit.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(visit)
        return visit
    except HTTPException:
        # Re-raise HTTP exceptions (like 403, 404) as-is
        raise
    except Exception as e:
        error_msg = f"Error updating shop visit {visit_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        # Rollback the transaction in case of error
        db.rollback()
        raise HTTPException(status_code=500, detail="A database error occurred. Please try again later.")

@router.delete("/{visit_id}")
def delete_shop_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(ShopVisit).filter(ShopVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Shop visit not found")
    db.delete(visit)
    db.commit()
    return {"message": "Shop visit deleted successfully"}

