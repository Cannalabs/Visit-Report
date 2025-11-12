import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import ShopVisit, User
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
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(ShopVisit)
    if customer_id:
        query = query.filter(ShopVisit.customer_id == customer_id)
    if is_draft is not None:
        query = query.filter(ShopVisit.is_draft == is_draft)
    return query.order_by(ShopVisit.visit_date.desc()).offset(skip).limit(limit).all()

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
    visit = db.query(ShopVisit).filter(ShopVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Shop visit not found")
    
    # Get all update data - use exclude_unset=False to include all fields that were sent
    # This ensures we update all fields, not just the ones that changed
    update_data = visit_update.dict(exclude_unset=False)
    
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
    
    # Update all fields that are provided
    for field, value in update_data.items():
        # Skip fields that shouldn't be updated via this endpoint
        if field in ['id', 'created_at', 'created_by']:
            continue
        # Handle None values for optional fields
        if value is None and field in ['draft_saved_at', 'signature_date', 'gps_coordinates', 'signature', 'signature_signer_name']:
            setattr(visit, field, None)
        else:
            setattr(visit, field, value)
    
    # Update updated_at timestamp
    from datetime import datetime, timezone
    visit.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(visit)
    return visit

@router.delete("/{visit_id}")
def delete_shop_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(ShopVisit).filter(ShopVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Shop visit not found")
    db.delete(visit)
    db.commit()
    return {"message": "Shop visit deleted successfully"}

