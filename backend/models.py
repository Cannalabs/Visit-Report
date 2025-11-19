from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    sales_rep = "sales_rep"
    manager = "manager"

class VisitStatus(str, enum.Enum):
    appointment = "appointment"
    draft = "draft"
    done = "done"

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    shop_name = Column(String(255), nullable=False)
    shop_type = Column(String(100))
    shop_address = Column(Text)
    zipcode = Column(String(20))
    city = Column(String(100))
    county = Column(String(100))
    contact_person = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    job_title = Column(String(100))
    shop_timings = Column(Text)  # Working hours, e.g., "Mon-Fri: 9:00 AM - 6:00 PM"
    visit_notes = Column(Text)  # Notes for next visit, e.g., "Bring new samples on next visit"
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    visits = relationship("ShopVisit", back_populates="customer")

class ShopVisit(Base):
    __tablename__ = "shop_visits"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    
    # Shop information (duplicated from customer for snapshot)
    shop_name = Column(String(255), nullable=False)
    shop_type = Column(String(100))
    shop_address = Column(Text)
    zipcode = Column(String(20))
    city = Column(String(100))
    county = Column(String(100))
    contact_person = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    job_title = Column(String(100))
    shop_timings = Column(Text)  # Working hours snapshot
    
    # Visit status and workflow
    visit_status = Column(SQLEnum(VisitStatus), default=VisitStatus.draft)
    
    # Appointment stage fields
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # User assigned to the visit
    planned_visit_date = Column(DateTime(timezone=True), nullable=True)  # Planned date for appointment
    appointment_description = Column(Text, nullable=True)  # Optional description for planning
    
    # Visit details
    visit_date = Column(DateTime(timezone=True), nullable=False)
    visit_duration = Column(Integer, default=60)  # in minutes
    visit_purpose = Column(String(100))
    
    # Product visibility
    product_visibility_score = Column(Integer, default=50)
    products_discussed = Column(JSON, default=list)
    competitor_presence = Column(String(50))
    
    # Training
    training_provided = Column(Boolean, default=False)
    training_topics = Column(JSON, default=list)
    support_materials_required = Column(Boolean, default=False)
    support_materials_items = Column(JSON, default=list)
    support_materials_other_text = Column(Text)
    
    # Commercial
    commercial_outcome = Column(String(100))
    order_value = Column(Float, default=0.0)
    overall_satisfaction = Column(Integer, default=5)
    sales_data = Column(JSON, default=dict)  # Sales and purchase breakdown data
    
    # Follow-up
    follow_up_required = Column(Boolean, default=False)
    follow_up_notes = Column(Text)
    
    # Additional
    notes = Column(Text)
    visit_photos = Column(JSON, default=list)
    gps_coordinates = Column(JSON)
    
    # Signature
    signature = Column(Text)  # Base64 encoded
    signature_signer_name = Column(String(255))
    signature_date = Column(DateTime(timezone=True))
    
    # Metadata
    calculated_score = Column(Integer)
    priority_level = Column(String(50))
    is_draft = Column(Boolean, default=False)
    draft_saved_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    customer = relationship("Customer", back_populates="visits")

class Configuration(Base):
    __tablename__ = "configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    config_type = Column(String(100), nullable=False)  # visit_purposes, canna_products, etc.
    config_name = Column(Text, nullable=False)  # Changed to Text to support long values like logo data URLs
    config_value = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"))
    actor_email = Column(String(255))
    target_user_id = Column(Integer, ForeignKey("users.id"))
    target_email = Column(String(255))
    action = Column(String(100), nullable=False)
    details = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    phone = Column(String(50))
    bio = Column(Text)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.sales_rep)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    profile = relationship("UserProfile", backref="user", uselist=False)
    created_visits = relationship("ShopVisit", foreign_keys=[ShopVisit.created_by])

