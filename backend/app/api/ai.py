"""AI service API endpoints."""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.azure_ai import azure_ai_service
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


class ChatMessage(BaseModel):
    """Chat message model."""

    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")


class ChatStreamRequest(BaseModel):
    """Request model for streaming chat."""

    messages: List[ChatMessage] = Field(..., description="Chat messages")
    model: str = Field(default="", description="Model to use (optional)")
    max_tokens: int = Field(
        default=1000, ge=1, le=4000, description="Maximum tokens to generate"
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Generation temperature"
    )


class JiraCommentRequest(BaseModel):
    """Request model for Jira comment generation."""

    task_description: str = Field(..., description="Jira task description")
    task_type: str = Field(default="development", description="Type of task")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


class GitHubPRRequest(BaseModel):
    """Request model for GitHub PR description generation."""

    pr_title: str = Field(..., description="Pull Request title")
    code_changes: str = Field(..., description="Code changes summary")
    branch_name: str = Field(default="", description="Branch name")
    commit_messages: List[str] = Field(
        default_factory=list, description="Commit messages"
    )


# Response models
class GenerateTextResponse(BaseModel):
    """Response model for text generation."""

    text: str
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class JiraCommentResponse(BaseModel):
    """Response model for Jira comment generation."""

    generated_content: str
    suggestions: List[str]
    model: str
    tokens_used: int
    error: str = ""


class GitHubPRResponse(BaseModel):
    """Response model for GitHub PR description generation."""

    generated_description: str
    suggested_title: str
    model: str
    tokens_used: int
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

        result = await azure_ai_service.generate_text(
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


@router.post("/chat/stream")
async def chat_stream(request: ChatStreamRequest):
    """Generate streaming chat responses."""
    try:
        logger.info(f"Starting chat stream with {len(request.messages)} messages")

        # Convert Pydantic models to dicts
        messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        async def generate():
            try:
                async for chunk in azure_ai_service.generate_chat_stream(
                    messages=messages,
                    model=request.model or None,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                ):
                    yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Chat streaming error: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    except Exception as e:
        logger.error(f"Chat stream initialization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jira/generate", response_model=JiraCommentResponse)
async def generate_jira_comment(request: JiraCommentRequest):
    """Generate Jira task comment using specialized AI prompt."""
    try:
        logger.info(f"Generating Jira comment for task type: {request.task_type}")

        result = await azure_ai_service.generate_jira_comment(
            task_description=request.task_description,
            task_type=request.task_type,
            context=request.context,
        )

        return JiraCommentResponse(**result)

    except Exception as e:
        logger.error(f"Jira comment generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/pr", response_model=GitHubPRResponse)
async def generate_github_pr_description(request: GitHubPRRequest):
    """Generate GitHub PR description using specialized AI prompt."""
    try:
        logger.info(f"Generating GitHub PR description for: {request.pr_title}")

        result = await azure_ai_service.generate_github_pr_description(
            pr_title=request.pr_title,
            code_changes=request.code_changes,
            branch_name=request.branch_name,
            commit_messages=request.commit_messages,
        )

        return GitHubPRResponse(**result)

    except Exception as e:
        logger.error(f"GitHub PR description generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/refresh")
async def refresh_auth():
    """Refresh AI service authentication."""
    try:
        await azure_ai_service.refresh_auth()
        return {"status": "success", "message": "Authentication refreshed"}

    except Exception as e:
        logger.error(f"Auth refresh failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
