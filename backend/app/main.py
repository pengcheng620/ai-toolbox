"""FastAPI application main module."""

from contextlib import asynccontextmanager
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.utils.logger import get_logger

# Import routers
from app.api.auth import router as auth_router
from app.api.config import router as config_router
# New modular AI routers
from app.api.ai import router as ai_router
from app.api.base import router as base_ai_router
from app.api.chat import router as chat_router
from app.api.jira import router as jira_router
from app.api.github import router as github_router
from app.api.sprint_planning import router as sprint_planning_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"CORS origins: {settings.cors_origins_list}")

    yield

    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Toolbox Backend API Service",
    debug=settings.debug,
    lifespan=lifespan,
)

# 改进的CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
)

# Add request logging middleware for debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging purposes"""
    start_time = time.time()

    # Log request details for debugging
    logger.info(f"🔍 Incoming request: {request.method} {request.url}")
    logger.info(f"🔍 Headers: {dict(request.headers)}")
    logger.info(f"🔍 Client: {request.client}")

    # Process request
    response = await call_next(request)

    # Log response details
    process_time = time.time() - start_time
    logger.info(f"🔍 Response: {response.status_code} (took {process_time:.3f}s)")

    return response

# Include routers with modular structure
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["Auth"])
app.include_router(config_router, prefix=f"{settings.api_v1_prefix}", tags=["Configuration"])
app.include_router(ai_router, prefix=f"{settings.api_v1_prefix}/ai", tags=["AI Services"])
app.include_router(base_ai_router, prefix=f"{settings.api_v1_prefix}/ai", tags=["AI Base"])
app.include_router(chat_router, prefix=f"{settings.api_v1_prefix}/ai/chat", tags=["AI Chat"])
app.include_router(jira_router, prefix=f"{settings.api_v1_prefix}/ai/jira", tags=["AI Jira"])
app.include_router(github_router, prefix=f"{settings.api_v1_prefix}/ai/github", tags=["AI GitHub"])
app.include_router(sprint_planning_router, prefix=f"{settings.api_v1_prefix}/sprint-planning", tags=["Sprint Planning"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "status": "healthy",
        "message": f"Welcome to {settings.app_name}!",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/debug/cors")
async def debug_cors():
    """Debug CORS configuration."""
    logger.info(f"DEBUG_CORS_ENDPOINT: settings.cors_origins_list is {settings.cors_origins_list}")
    return {
        "cors_origins_from_settings": settings.cors_origins_list,
        "cors_methods_configured": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
        "cors_headers_configured": [
            "Accept", "Accept-Language", "Content-Language", "Content-Type",
            "Authorization", "X-Requested-With", "Origin",
            "Access-Control-Request-Method", "Access-Control-Request-Headers",
        ],
        "raw_CORS_ORIGINS_env_var": os.getenv("CORS_ORIGINS"),
        "pydantic_settings_cors_origins_field": settings.cors_origins,
    }
