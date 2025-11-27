"""
Automatic database migration system.
Checks for missing tables and columns on startup and adds them automatically.
"""
from sqlalchemy import inspect, text, MetaData, Table, Column, Integer, String, Boolean, Float, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from models import VisitStatus
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
    elif isinstance(column.type, SQLEnum):
        # For enum types, use VARCHAR with the enum values
        enum_values = [e.value for e in column.type.enums] if hasattr(column.type, 'enums') else []
        if enum_values:
            # Use the longest enum value length + some buffer
            max_length = max(len(str(v)) for v in enum_values) + 10
            return f"VARCHAR({max_length})"
        return "VARCHAR(50)"  # Default for enums
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
            # Handle enum defaults
            if hasattr(default_value, 'value'):
                default_value = default_value.value
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
            if col_name == 'config_name' or col_name == 'signature':  # Special logging for problematic columns
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
    
    # Migrate county to country for Customer and ShopVisit tables
    try:
        migrate_county_to_country(engine)
    except Exception as e:
        logger.error(f"✗ Error during county to country migration: {e}")
    
    # Fix signature column type in user_profiles table (VARCHAR to TEXT)
    try:
        fix_signature_column_type(engine)
    except Exception as e:
        logger.error(f"✗ Error during signature column type migration: {e}")
    
    if not migrations_applied:
        logger.info("✓ Database schema is up to date, no migrations needed")
    
    logger.info("=" * 60)
    logger.info("Migration check completed")
    logger.info("=" * 60)
    
    # Create performance indexes after migrations
    try:
        from add_performance_indexes import create_performance_indexes
        logger.info("\n" + "=" * 60)
        logger.info("Checking performance indexes...")
        logger.info("=" * 60)
        indexes_created = create_performance_indexes()
        if indexes_created > 0:
            logger.info(f"✓ Created {indexes_created} performance indexes")
    except Exception as e:
        logger.warning(f"Could not create performance indexes: {e}")
        # Don't fail migrations if index creation fails
    
    return migrations_applied

def fix_signature_column_type(engine: Engine):
    """Fix signature column type from VARCHAR(255) to TEXT in user_profiles table."""
    table_name = 'user_profiles'
    column_name = 'signature'
    
    try:
        if not table_exists(engine, table_name):
            logger.info(f"Table '{table_name}' does not exist, skipping signature column fix")
            return
        
        existing_columns = get_table_columns(engine, table_name)
        if column_name not in existing_columns:
            logger.info(f"Column '{column_name}' does not exist in table '{table_name}', skipping")
            return
        
        existing_col = existing_columns[column_name]
        existing_type = str(existing_col['type']).upper()
        
        # Check if column is VARCHAR and needs to be TEXT
        if 'VARCHAR' in existing_type or 'CHARACTER VARYING' in existing_type:
            logger.info(f"Fixing signature column type in '{table_name}': {existing_type} → TEXT")
            if alter_column_type(engine, table_name, column_name, 'TEXT'):
                logger.info(f"✓ Successfully fixed signature column type in '{table_name}'")
            else:
                logger.warning(f"✗ Failed to fix signature column type in '{table_name}'")
        else:
            logger.info(f"Signature column in '{table_name}' already has correct type: {existing_type}")
    except Exception as e:
        logger.error(f"Error fixing signature column type: {e}")

def migrate_county_to_country(engine: Engine):
    """Migrate county column to country column for Customer and ShopVisit tables."""
    tables_to_migrate = ['customers', 'shop_visits']
    
    for table_name in tables_to_migrate:
        try:
            # Check if county column exists and country column doesn't exist
            if column_exists(engine, table_name, 'county') and not column_exists(engine, table_name, 'country'):
                logger.info(f"Migrating 'county' to 'country' in table '{table_name}'...")
                
                with engine.connect() as conn:
                    # Copy data from county to country
                    conn.execute(text(f'UPDATE "{table_name}" SET country = county WHERE county IS NOT NULL'))
                    conn.commit()
                    logger.info(f"✓ Copied data from 'county' to 'country' in table '{table_name}'")
            
            # Drop county column if it exists and country column exists
            if column_exists(engine, table_name, 'county') and column_exists(engine, table_name, 'country'):
                logger.info(f"Dropping 'county' column from table '{table_name}'...")
                with engine.connect() as conn:
                    conn.execute(text(f'ALTER TABLE "{table_name}" DROP COLUMN IF EXISTS "county"'))
                    conn.commit()
                    logger.info(f"✓ Dropped 'county' column from table '{table_name}'")
        except Exception as e:
            logger.warning(f"Could not migrate county to country for table '{table_name}': {e}")

