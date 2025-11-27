from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from models import Customer, User
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from auth import get_current_user

router = APIRouter()

@router.post("", response_model=CustomerResponse)
@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Additional validation: ensure shop_name is not empty
    if not customer.shop_name or not customer.shop_name.strip():
        raise HTTPException(status_code=400, detail="Shop name is required and cannot be empty")
    
    # Additional validation: ensure shop_type is provided
    if not customer.shop_type or not customer.shop_type.strip():
        raise HTTPException(status_code=400, detail="Shop type is required")
    
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("", response_model=List[CustomerResponse])
@router.get("/", response_model=List[CustomerResponse])
def list_customers(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer)
    if status:
        query = query.filter(Customer.status == status)
    return query.offset(skip).limit(limit).all()

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_update.dict(exclude_unset=True)
    
    # Validate shop_name and shop_type only if they are being updated
    if 'shop_name' in update_data:
        if not update_data['shop_name'] or not str(update_data['shop_name']).strip():
            raise HTTPException(status_code=400, detail="Shop name is required and cannot be empty")
        update_data['shop_name'] = str(update_data['shop_name']).strip()
    
    if 'shop_type' in update_data:
        if not update_data['shop_type'] or not str(update_data['shop_type']).strip():
            raise HTTPException(status_code=400, detail="Shop type is required and cannot be empty")
        update_data['shop_type'] = str(update_data['shop_type']).strip()
    
    # Update all provided fields
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}

