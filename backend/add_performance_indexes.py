"""
Migration script to add database indexes for performance optimization.
Run this script to add indexes to frequently queried columns.
"""
from sqlalchemy import create_engine, text, Index
from config import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_indexes():
    """Add performance indexes to database tables."""
    # Convert async URL to sync URL if needed
    database_url = str(DATABASE_URL)
    if database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif database_url.startswith("postgresql://"):
        if "+psycopg2" not in database_url:
            database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    engine = create_engine(database_url)
    
    indexes = [
        # ShopVisit table indexes
        ("shop_visits", "customer_id", "idx_shop_visits_customer_id"),
        ("shop_visits", "visit_status", "idx_shop_visits_visit_status"),
        ("shop_visits", "is_draft", "idx_shop_visits_is_draft"),
        ("shop_visits", "created_at", "idx_shop_visits_created_at"),
        ("shop_visits", "visit_date", "idx_shop_visits_visit_date"),
        ("shop_visits", "follow_up_required", "idx_shop_visits_follow_up_required"),
        ("shop_visits", "created_by", "idx_shop_visits_created_by"),
        ("shop_visits", "follow_up_assigned_user_id", "idx_shop_visits_follow_up_assigned_user_id"),
        
        # Composite indexes for common query patterns
        ("shop_visits", "(visit_status, is_draft)", "idx_shop_visits_status_draft"),
        ("shop_visits", "(customer_id, visit_status)", "idx_shop_visits_customer_status"),
        ("shop_visits", "(follow_up_required, follow_up_stage)", "idx_shop_visits_followup"),
        
        # Customer table indexes
        ("customers", "status", "idx_customers_status"),
        ("customers", "shop_type", "idx_customers_shop_type"),
        
        # Configuration table indexes
        ("configurations", "config_type", "idx_configurations_type"),
        ("configurations", "(config_type, is_active)", "idx_configurations_type_active"),
        
        # AuditLog table indexes
        ("audit_logs", "created_at", "idx_audit_logs_created_at"),
        ("audit_logs", "actor_user_id", "idx_audit_logs_actor"),
    ]
    
    with engine.connect() as conn:
        for table, column, index_name in indexes:
            try:
                # Check if index already exists
                check_query = text(f"""
                    SELECT 1 FROM pg_indexes 
                    WHERE indexname = '{index_name}'
                """)
                result = conn.execute(check_query)
                if result.fetchone():
                    logger.info(f"Index {index_name} already exists, skipping...")
                    continue
                
                # Create index
                if column.startswith("("):
                    # Composite index
                    create_query = text(f"""
                        CREATE INDEX {index_name} 
                        ON {table} {column}
                    """)
                else:
                    # Single column index
                    create_query = text(f"""
                        CREATE INDEX {index_name} 
                        ON {table} ({column})
                    """)
                
                conn.execute(create_query)
                conn.commit()
                logger.info(f"✓ Created index {index_name} on {table}.{column}")
            except Exception as e:
                logger.error(f"✗ Failed to create index {index_name}: {str(e)}")
                conn.rollback()
    
    logger.info("Index creation completed!")

if __name__ == "__main__":
    add_indexes()

