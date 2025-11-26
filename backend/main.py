import logging
from fastapi import FastAPI, Response, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from jinja2 import Template
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, DatabaseError, SQLAlchemyError
from config import settings
from db import engine, Base, get_db
from migration import run_migrations
from routers import (
    auth,
    customers,
    shop_visits,
    configurations,
    audit_logs,
    user_profiles,
    users,
    files
)
from models import Configuration
from sqlalchemy.orm import Session
from exception_handlers import (
    validation_exception_handler,
    database_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from datetime import datetime, timezone
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="CANNA Visit Report API", version="1.0.0")

def is_browser_request(request: Request) -> bool:
    """Check if request is from a browser (not API client)"""
    accept = request.headers.get("Accept", "")
    # Browser requests typically accept text/html
    # API clients typically accept application/json
    return "text/html" in accept or ("*/*" in accept and "application/json" not in accept)

def load_error_template() -> str:
    """Load the error.html template"""
    from pathlib import Path
    # Get the directory where main.py is located
    backend_dir = Path(__file__).parent
    template_path = backend_dir / "templates" / "error.html"
    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()

# Add GZip compression for API responses (reduces payload size significantly)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS from config - Allow specific origins for network access
# If no allowed origins are configured, allow all (for development/network access)
if not settings.allowed_origins_list:
    # Allow all origins in development or when no origins are configured
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

@app.on_event("startup")
async def on_startup():
    # Log JWT configuration status (without exposing the actual key)
    jwt_key_set = settings.secret_key and settings.secret_key != "your-secret-key-change-this-in-production"
    logger.info(f"JWT Authentication: {'Configured' if jwt_key_set else 'Using default key (INSECURE - change in .env.conf)'}")
    if jwt_key_set:
        logger.info(f"JWT Secret Key: {'*' * 20}... (length: {len(settings.secret_key)})")
    else:
        logger.warning("JWT Secret Key is using default value. Set SECRET_KEY in .env.conf for production!")
    
    # Run database migrations to add any missing tables and columns
    try:
        run_migrations()
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Database migration failed: {e}", exc_info=True)
        # Continue anyway - tables might already exist

# Root-level test routes
@app.get("/")
def root():
    return {"status": "ok", "message": "CANNA Visit Report API", "version": "1.0.0"}

@app.get("/hello")
def hello_root(name: str = "world"):
    return {"message": f"Hello, {name}!"}

# Health check endpoint (no authentication required)
@app.get("/health")
@app.get("/api/health")
@app.options("/health")
@app.options("/api/health")
async def health_check():
    """
    Health check endpoint to verify server is running.
    Returns server status and current timestamp.
    Handles both GET and OPTIONS requests for CORS.
    """
    try:
        # Simple database connectivity check
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()  # Consume the result
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "disconnected"
    
    return {
        "status": "up" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# API test routes
@app.get("/api/")
def read_root():
    return {"status": "ok", "message": "FastAPI is running"}

@app.get("/api/hello")
def hello(name: str = "world"):
    return {"message": f"Hello, {name}!"}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(shop_visits.router, prefix="/api/shop-visits", tags=["shop-visits"])
app.include_router(configurations.router, prefix="/api/configurations", tags=["configurations"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["audit-logs"])
app.include_router(user_profiles.router, prefix="/api/user-profiles", tags=["user-profiles"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(files.router, prefix="/api/files", tags=["files"])

# Favicon endpoint - serve company logo as favicon
@app.get("/favicon.ico")
@app.head("/favicon.ico")
async def get_favicon(db: Session = Depends(get_db)):
    """Serve company logo as favicon"""
    try:
        logo_config = db.query(Configuration).filter(
            Configuration.config_type == "company_settings",
            Configuration.config_value == "company_logo",
            Configuration.is_active == True
        ).first()
        
        if logo_config and logo_config.config_name:
            logo_data = logo_config.config_name
            
            # Check if it's a data URL (base64 encoded)
            if logo_data.startswith("data:image"):
                # Extract base64 data
                header, encoded = logo_data.split(",", 1)
                image_data = base64.b64decode(encoded)
                
                # Determine content type from data URL
                if "image/png" in header:
                    media_type = "image/png"
                elif "image/jpeg" in header or "image/jpg" in header:
                    media_type = "image/jpeg"
                elif "image/svg+xml" in header:
                    media_type = "image/svg+xml"
                else:
                    media_type = "image/png"
                
                return Response(content=image_data, media_type=media_type)
    except Exception:
        pass
    
    # Return 204 No Content if no logo found (silent fail for favicon)
    return Response(status_code=204)

# Register centralized exception handlers
# Order matters: more specific handlers should be registered first
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, database_exception_handler)
app.add_exception_handler(DatabaseError, database_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Custom exception handler for HTML error pages (browser requests)
# This handles HTTP exceptions and returns HTML for browsers, JSON for API clients
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler_html(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions - return HTML for browsers, JSON for API clients"""
    # Check if request is from browser
    if is_browser_request(request) and exc.status_code in [401, 403, 404]:
        # Determine error details
        if exc.status_code == 401:
            icon = "🔒"
            title = "Unauthorized"
            message = "You need to authenticate to access this resource."
            detail = exc.detail if isinstance(exc.detail, str) else "Authentication required"
        elif exc.status_code == 403:
            icon = "🚫"
            title = "Forbidden"
            message = "You don't have permission to access this resource."
            detail = exc.detail if isinstance(exc.detail, str) else "Access denied"
        else:  # 404
            icon = "🔍"
            title = "Not Found"
            message = "The requested resource could not be found."
            detail = exc.detail if isinstance(exc.detail, str) else "Resource not found"
        
        # Get frontend URL from request referer or origin
        frontend_url = None
        referer = request.headers.get("Referer") or request.headers.get("Referrer")
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
            except:
                pass
        
        # If no referer, try to infer from origin (for production)
        if not frontend_url:
            origin = request.headers.get("Origin")
            if origin:
                frontend_url = origin
            else:
                # Default: assume frontend on same origin (production) or port 5173 (dev)
                scheme = request.url.scheme
                host = request.url.hostname
                if request.url.port == 8000:
                    # Dev mode: backend on 8000, frontend likely on 5173
                    frontend_url = f"{scheme}://{host}:5173"
                else:
                    # Production: same origin
                    frontend_url = f"{scheme}://{host}"
        
        # Load and render HTML template
        template_content = load_error_template()
        template = Template(template_content)
        html_content = template.render(
            status_code=exc.status_code,
            icon=icon,
            title=title,
            message=message,
            detail=detail,
            frontend_url=frontend_url
        )
        
        return HTMLResponse(content=html_content, status_code=exc.status_code)
    
    # For API clients, let the centralized handler deal with it
    return await http_exception_handler(request, exc)
