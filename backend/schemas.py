from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import UserRole, VisitStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[UserRole] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Customer Schemas
class CustomerBase(BaseModel):
    shop_name: str
    shop_type: str
    shop_address: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    region: Optional[str] = None  # Sales region
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    job_title: Optional[str] = None
    opening_time: Optional[str] = None  # Opening time, e.g., "09:00"
    closing_time: Optional[str] = None  # Closing time, e.g., "18:00"
    visit_notes: Optional[str] = None
    status: Optional[str] = "active"
    
    @field_validator("shop_name", mode="before")
    @classmethod
    def validate_shop_name(cls, v):
        # Allow empty strings for existing database records (responses)
        # Only validate on create/update operations
        if v is None:
            return ""
        if isinstance(v, str):
            # For responses, allow empty strings
            # For input validation, this will be checked in the router
            return v.strip() if v.strip() else v
        return v
    
    @field_validator("shop_type", mode="before")
    @classmethod
    def validate_shop_type(cls, v):
        # Allow empty strings for existing database records (responses)
        # Only validate on create/update operations
        if v is None:
            return ""
        if isinstance(v, str):
            # For responses, allow empty strings
            # For input validation, this will be checked in the router
            return v.strip() if v.strip() else v
        return v

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    shop_name: Optional[str] = None
    shop_type: Optional[str] = None
    shop_address: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    region: Optional[str] = None  # Sales region
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    job_title: Optional[str] = None
    opening_time: Optional[str] = None  # Opening time, e.g., "09:00"
    closing_time: Optional[str] = None  # Closing time, e.g., "18:00"
    visit_notes: Optional[str] = None
    status: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    shop_name: str  # Allow empty strings for existing records
    shop_type: str  # Allow empty strings for existing records
    shop_address: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    region: Optional[str] = None  # Sales region
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    job_title: Optional[str] = None
    opening_time: Optional[str] = None  # Opening time, e.g., "09:00"
    closing_time: Optional[str] = None  # Closing time, e.g., "18:00"
    visit_notes: Optional[str] = None
    status: Optional[str] = "active"
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Shop Visit Schemas
class ShopVisitBase(BaseModel):
    customer_id: int
    shop_name: str
    shop_type: Optional[str] = None
    shop_address: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    region: Optional[str] = None  # Sales region
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    job_title: Optional[str] = None
    opening_time: Optional[str] = None  # Opening time snapshot, e.g., "09:00"
    closing_time: Optional[str] = None  # Closing time snapshot, e.g., "18:00"
    visit_status: Optional[VisitStatus] = VisitStatus.draft
    assigned_user_id: Optional[int] = None
    planned_visit_date: Optional[datetime] = None
    appointment_description: Optional[str] = None
    visit_date: datetime
    visit_duration: Optional[int] = 60
    visit_purpose: Optional[str] = None
    product_visibility_score: Optional[int] = 50
    products_discussed: Optional[List[str]] = []
    competitor_presence: Optional[str] = None
    training_provided: Optional[bool] = False
    training_topics: Optional[List[str]] = []
    support_materials_required: Optional[bool] = False
    support_materials_items: Optional[List[str]] = []
    support_materials_other_text: Optional[str] = None
    commercial_outcome: Optional[str] = None
    order_value: Optional[float] = 0.0
    overall_satisfaction: Optional[int] = 5
    sales_data: Optional[Dict[str, Any]] = {}
    follow_up_required: Optional[bool] = False
    follow_up_notes: Optional[str] = None
    notes: Optional[str] = None
    visit_photos: Optional[List[str]] = []
    gps_coordinates: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None
    signature_signer_name: Optional[str] = None
    signature_date: Optional[datetime] = None
    calculated_score: Optional[int] = None
    priority_level: Optional[str] = None
    is_draft: Optional[bool] = False

class ShopVisitCreate(ShopVisitBase):
    pass

class ShopVisitUpdate(BaseModel):
    customer_id: Optional[int] = None
    shop_name: Optional[str] = None
    shop_type: Optional[str] = None
    shop_address: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    region: Optional[str] = None  # Sales region
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    job_title: Optional[str] = None
    opening_time: Optional[str] = None  # Opening time snapshot, e.g., "09:00"
    closing_time: Optional[str] = None  # Closing time snapshot, e.g., "18:00"
    visit_status: Optional[VisitStatus] = None
    assigned_user_id: Optional[int] = None
    planned_visit_date: Optional[datetime] = None
    appointment_description: Optional[str] = None
    visit_date: Optional[datetime] = None
    visit_duration: Optional[int] = None
    visit_purpose: Optional[str] = None
    product_visibility_score: Optional[int] = None
    products_discussed: Optional[List[str]] = None
    competitor_presence: Optional[str] = None
    training_provided: Optional[bool] = None
    training_topics: Optional[List[str]] = None
    support_materials_required: Optional[bool] = None
    support_materials_items: Optional[List[str]] = None
    support_materials_other_text: Optional[str] = None
    commercial_outcome: Optional[str] = None
    order_value: Optional[float] = None
    overall_satisfaction: Optional[int] = None
    sales_data: Optional[Dict[str, Any]] = None
    follow_up_required: Optional[bool] = None
    follow_up_notes: Optional[str] = None
    notes: Optional[str] = None
    visit_photos: Optional[List[str]] = None
    gps_coordinates: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None
    signature_signer_name: Optional[str] = None
    signature_date: Optional[datetime] = None
    calculated_score: Optional[int] = None
    priority_level: Optional[str] = None
    is_draft: Optional[bool] = None
    draft_saved_at: Optional[datetime] = None

class ShopVisitResponse(ShopVisitBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    
    class Config:
        from_attributes = True

# Configuration Schemas
class ConfigurationBase(BaseModel):
    config_type: str
    config_name: str
    config_value: str
    is_active: Optional[bool] = True
    display_order: Optional[int] = 0

class ConfigurationCreate(ConfigurationBase):
    pass

class ConfigurationUpdate(BaseModel):
    config_type: Optional[str] = None
    config_name: Optional[str] = None
    config_value: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class ConfigurationResponse(ConfigurationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogCreate(BaseModel):
    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None
    target_user_id: Optional[int] = None
    target_email: Optional[str] = None
    action: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogResponse(AuditLogCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# User Profile Schemas
class UserProfileBase(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = {}

class UserProfileCreate(UserProfileBase):
    user_id: int

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

