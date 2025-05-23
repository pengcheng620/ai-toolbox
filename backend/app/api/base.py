"""Base AI API endpoints."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.base_ai import base_ai_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class GenerateTextRequest(BaseModel):
    """Request model for text generation."""

    prompt: str = Field(..., description="Input prompt for text generation")
    model: str = Field(default="", description="Model to use (optional)")
    max_tokens: int = Field(
        default=1000, ge=1, le=4000, description="Maximum tokens to generate"
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Generation temperature"
    )
    system_message: str = Field(default="", description="System message (optional)")


# Response models
class GenerateTextResponse(BaseModel):
    """Response model for text generation."""

    text: str
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str
    service: str
    auth_method: str
    endpoint: str


# Endpoints
@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check AI service health."""
    try:
        from app.config import settings

        return HealthResponse(
            status="healthy",
            service="azure_ai",
            auth_method="oauth" if settings.use_oauth_auth else "api_key",
            endpoint=settings.azure_openai_endpoint,
        )
    except Exception as e:
        logger.error(f"AI health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable")


@router.post("/generate", response_model=GenerateTextResponse)
async def generate_text(request: GenerateTextRequest):
    """Generate text using Azure OpenAI with LangChain."""
    try:
        logger.info(f"Generating text with prompt length: {len(request.prompt)}")

        result = await base_ai_service.generate_text(
            prompt=request.prompt,
            model=request.model or None,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system_message=request.system_message or None,
        )

        return GenerateTextResponse(**result)

    except Exception as e:
        logger.error(f"Text generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/refresh")
async def refresh_auth():
    """Refresh AI service authentication."""
    try:
        await base_ai_service.refresh_auth()
        return {"status": "success", "message": "Authentication refreshed"}

    except Exception as e:
        logger.error(f"Auth refresh failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 