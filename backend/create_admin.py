#!/usr/bin/env python3
"""
Script to create an admin user in the database.
Usage: python create_admin.py <email> <password> <full_name>
"""
import sys
from db import SessionLocal
from models import User, UserRole
from auth import get_password_hash

def create_admin_user(email: str, password: str, full_name: str = "Admin User"):
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            return False
        
        # Create new admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            role=UserRole.admin,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Full Name: {admin_user.full_name}")
        print(f"   Role: {admin_user.role}")
        print(f"   ID: {admin_user.id}")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating user: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <email> <password> [full_name]")
        print("\nExample:")
        print("  python create_admin.py admin@example.com mypassword123 'Admin User'")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Admin User"
    
    create_admin_user(email, password, full_name)

