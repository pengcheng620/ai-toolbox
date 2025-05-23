"""FastAPI application main module."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.utils.logger import get_logger

# Import routers
from app.api.auth import router as auth_router
# New modular AI routers
from app.api.base import router as base_ai_router
from app.api.chat import router as chat_router
from app.api.jira import router as jira_router
from app.api.github import router as github_router

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

# Include routers with modular structure
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth", tags=["Auth"])
app.include_router(base_ai_router, prefix=f"{settings.api_v1_prefix}/ai", tags=["AI Base"])
app.include_router(chat_router, prefix=f"{settings.api_v1_prefix}/ai/chat", tags=["AI Chat"])
app.include_router(jira_router, prefix=f"{settings.api_v1_prefix}/ai/jira", tags=["AI Jira"])
app.include_router(github_router, prefix=f"{settings.api_v1_prefix}/ai/github", tags=["AI GitHub"])


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


# 添加调试端点
@app.options("/{full_path:path}")
async def handle_options(full_path: str):
    """Handle all OPTIONS requests for CORS preflight."""
    logger.info(f"OPTIONS request to: {full_path}")
    return {"message": "CORS preflight OK"}


@app.get("/debug/cors")
async def debug_cors():
    """Debug CORS configuration."""
    return {
        "cors_origins": settings.cors_origins_list,
        "cors_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
        "cors_headers": [
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
    }
