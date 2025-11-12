import logging
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, DatabaseError, SQLAlchemyError
from config import settings

logger = logging.getLogger(__name__)

def get_cors_origin(request: Request) -> str:
    """Determine the CORS origin to use based on request and configuration"""
    origin = request.headers.get("origin")
    allowed_origins = settings.allowed_origins_list
    
    # If no allowed origins configured, allow all origins (development mode)
    if not allowed_origins:
        return origin if origin else "*"
    elif origin and origin in allowed_origins:
        return origin
    else:
        return allowed_origins[0]

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors (422)"""
    cors_origin = get_cors_origin(request)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

async def database_exception_handler(request: Request, exc: DatabaseError):
    """Handle database-related errors"""
    logger.error(f"Database error: {exc}", exc_info=True)
    cors_origin = get_cors_origin(request)
    
    # Don't expose internal database errors to clients
    error_message = "A database error occurred. Please try again later."
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": error_message},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException | StarletteHTTPException):
    """Handle HTTP exceptions"""
    cors_origin = get_cors_origin(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            **(exc.headers if hasattr(exc, 'headers') and exc.headers else {}),
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    # Don't handle HTTPException or RequestValidationError here - they're handled above
    if isinstance(exc, (HTTPException, RequestValidationError, StarletteHTTPException)):
        raise exc
    
    error_detail = str(exc)
    logger.error(f"Unhandled exception: {error_detail}", exc_info=True)
    
    cors_origin = get_cors_origin(request)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

