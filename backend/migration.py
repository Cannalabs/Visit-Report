"""
Automatic database migration system.
Checks for missing tables and columns on startup and adds them automatically.
"""
from sqlalchemy import inspect, text, MetaData, Table, Column, Integer, String, Boolean, Float, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.engine import Engine
from sqlalchemy.exc import ProgrammingError
from db import engine, Base
from models import (
    User, UserProfile, Customer, ShopVisit, Configuration, AuditLog
)
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def get_table_columns(engine: Engine, table_name: str):
    """Get all columns for a given table."""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        return {col['name']: col for col in columns}
    except Exception as e:
        logger.warning(f"Could not get columns for table {table_name}: {e}")
        return {}

def column_exists(engine: Engine, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    columns = get_table_columns(engine, table_name)
    return column_name in columns

def table_exists(engine: Engine, table_name: str) -> bool:
    """Check if a table exists."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def get_column_type_sql(column):
    """Convert SQLAlchemy column type to SQL string."""
    if isinstance(column.type, Integer):
        return "INTEGER"
    elif isinstance(column.type, String):
        length = column.type.length if hasattr(column.type, 'length') and column.type.length else 255
        return f"VARCHAR({length})"
    elif isinstance(column.type, Text):
        return "TEXT"
    elif isinstance(column.type, Boolean):
        return "BOOLEAN"
    elif isinstance(column.type, Float):
        return "FLOAT"
    elif isinstance(column.type, DateTime):
        return "TIMESTAMP WITH TIME ZONE"
    elif isinstance(column.type, JSON):
        return "JSON"
    else:
        return "TEXT"  # Default fallback

def add_missing_column(engine: Engine, table_name: str, column: Column):
    """Add a missing column to an existing table."""
    column_name = column.name
    column_type = get_column_type_sql(column)
    
    # Build ALTER TABLE statement
    alter_sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_type}'
    
    # Add nullable constraint
    if not column.nullable and column.primary_key is False:
        alter_sql += " NOT NULL"
    
    # Add default value if specified
    if column.default is not None:
        if hasattr(column.default, 'arg'):
            default_value = column.default.arg
            if isinstance(default_value, str):
                alter_sql += f" DEFAULT '{default_value}'"
            elif isinstance(default_value, bool):
                alter_sql += f" DEFAULT {str(default_value).upper()}"
            else:
                alter_sql += f" DEFAULT {default_value}"
        elif callable(column.default):
            # For callable defaults like func.now(), we'll handle them separately
            if 'now' in str(column.default):
                alter_sql += " DEFAULT CURRENT_TIMESTAMP"
            else:
                alter_sql += f" DEFAULT {column.default()}"
    
    try:
        with engine.connect() as conn:
            conn.execute(text(alter_sql))
            conn.commit()
        logger.info(f"✓ Added column '{column_name}' to table '{table_name}'")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to add column '{column_name}' to table '{table_name}': {e}")
        return False

def alter_column_type(engine: Engine, table_name: str, column_name: str, new_type: str):
    """Alter column type (e.g., VARCHAR to TEXT)."""
    try:
        # PostgreSQL specific: ALTER COLUMN TYPE
        # For VARCHAR to TEXT conversion, we can use USING clause to ensure compatibility
        if new_type == 'TEXT':
            alter_sql = f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE {new_type} USING "{column_name}"::text'
        else:
            alter_sql = f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE {new_type}'
        
        with engine.connect() as conn:
            conn.execute(text(alter_sql))
            conn.commit()
        logger.info(f"✓ Altered column '{column_name}' type to {new_type} in table '{table_name}'")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to alter column '{column_name}' type in table '{table_name}': {e}")
        return False

def check_and_migrate_table(engine: Engine, model_class):
    """Check if a table exists and has all required columns, migrate if needed."""
    table_name = model_class.__tablename__
    
    # Check if table exists
    if not table_exists(engine, table_name):
        logger.info(f"Table '{table_name}' does not exist, will be created by create_all()")
        return False
    
    # Table exists, check columns
    logger.info(f"Checking table '{table_name}' for missing columns...")
    existing_columns = get_table_columns(engine, table_name)
    model_columns = {col.name: col for col in model_class.__table__.columns}
    
    missing_columns = []
    type_mismatches = []
    
    for col_name, col in model_columns.items():
        if col_name not in existing_columns:
            missing_columns.append(col)
        else:
            # Check if column type needs to be updated (e.g., VARCHAR to TEXT)
            existing_col = existing_columns[col_name]
            existing_type = str(existing_col['type']).upper()
            expected_type = get_column_type_sql(col)
            
            # Debug logging for type comparison
            if col_name == 'config_name':  # Special logging for the problematic column
                logger.info(f"  Debug: Column '{col_name}' - existing: '{existing_type}', expected: '{expected_type}'")
            
            # Check if we need to upgrade VARCHAR to TEXT
            # PostgreSQL returns VARCHAR types as "VARCHAR(n)" or "character varying(n)"
            if ('VARCHAR' in existing_type or 'CHARACTER VARYING' in existing_type) and expected_type == 'TEXT':
                logger.info(f"  → Column '{col_name}' needs type upgrade: {existing_type} → {expected_type}")
                type_mismatches.append((col_name, expected_type))
    
    # Add missing columns
    for col in missing_columns:
        add_missing_column(engine, table_name, col)
    
    # Fix type mismatches (VARCHAR to TEXT)
    for col_name, new_type in type_mismatches:
        alter_column_type(engine, table_name, col_name, new_type)
    
    if missing_columns or type_mismatches:
        logger.info(f"✓ Migration completed for table '{table_name}'")
        return True
    
    return False

def run_migrations():
    """Run all migrations: create missing tables and add missing columns."""
    logger.info("=" * 60)
    logger.info("Starting database migration check...")
    logger.info("=" * 60)
    
    # First, create all tables (this handles missing tables)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Table creation check completed")
    except Exception as e:
        logger.error(f"✗ Error during table creation: {e}")
    
    # Then check each table for missing columns
    models_to_check = [
        User,
        UserProfile,
        Customer,
        ShopVisit,
        Configuration,
        AuditLog
    ]
    
    migrations_applied = False
    for model in models_to_check:
        try:
            if check_and_migrate_table(engine, model):
                migrations_applied = True
        except Exception as e:
            logger.error(f"✗ Error checking table {model.__tablename__}: {e}")
    
    if not migrations_applied:
        logger.info("✓ Database schema is up to date, no migrations needed")
    
    logger.info("=" * 60)
    logger.info("Migration check completed")
    logger.info("=" * 60)
    
    return migrations_applied

