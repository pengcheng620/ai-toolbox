"""AI service API endpoints."""

import logging
from typing import List, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.azure_ai import azure_ai_service
from app.utils.logger import get_logger
from app.utils.stream_handler import StreamableRequest, create_streaming_response

logger = get_logger(__name__)

router = APIRouter()


# Request models
class GenerateTextRequest(StreamableRequest):
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


class ChatStreamRequest(StreamableRequest):
    """Request model for streaming chat."""

    messages: List[ChatMessage] = Field(..., description="Chat messages")
    model: str = Field(default="", description="Model to use (optional)")
    max_tokens: int = Field(
        default=1000, ge=1, le=4000, description="Maximum tokens to generate"
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Generation temperature"
    )


class JiraCommentRequest(StreamableRequest):
    """Request model for Jira comment generation."""

    task_description: str = Field(..., description="Jira task description")
    task_type: str = Field(default="development", description="Type of task")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


class GitHubPRRequest(StreamableRequest):
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


@router.post("/generate", response_model=None)
async def generate_text(request: GenerateTextRequest):
    """Generate text using Azure OpenAI with LangChain. Supports both streaming and non-streaming."""
    try:
        logger.info(f"Generating text with prompt length: {len(request.prompt)}, stream: {request.stream}")

        if request.stream:
            # Return streaming response
            generator = azure_ai_service.generate_text_stream(
                prompt=request.prompt,
                model=request.model if request.model else None,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                system_message=request.system_message if request.system_message else None,
            )
            return await create_streaming_response(generator, "Text generation")
        else:
            # Return non-streaming response
            result = await azure_ai_service.generate_text(
                prompt=request.prompt,
                model=request.model if request.model else None,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                system_message=request.system_message if request.system_message else None,
            )
            return GenerateTextResponse(**result)

    except Exception as e:
        logger.error(f"Text generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream", response_model=None)
async def chat_stream(request: ChatStreamRequest):
    """Generate chat responses. Supports both streaming and non-streaming based on stream parameter."""
    try:
        logger.info(f"Starting chat with {len(request.messages)} messages, stream: {request.stream}")

        # Convert Pydantic models to dicts
        messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        if request.stream:
            # Return streaming response
            generator = azure_ai_service.generate_chat_stream(
                messages=messages,
                model=request.model if request.model else None,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )
            return await create_streaming_response(generator, "Chat generation")
        else:
            # For non-streaming, use the last message as prompt
            if messages:
                last_message = messages[-1]["content"]
                result = await azure_ai_service.generate_text(
                    prompt=last_message,
                    model=request.model if request.model else None,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                )
                return result
            else:
                raise HTTPException(status_code=400, detail="No messages provided")

    except Exception as e:
        logger.error(f"Chat generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jira/generate", response_model=None)
async def generate_jira_comment(request: JiraCommentRequest):
    """Generate Jira task comment using specialized AI prompt. Supports both streaming and non-streaming."""
    try:
        logger.info(f"Generating Jira comment for task type: {request.task_type}, stream: {request.stream}")

        if request.stream:
            # Return streaming response
            generator = azure_ai_service.generate_jira_comment_stream(
                task_description=request.task_description,
                task_type=request.task_type,
                context=request.context,
            )
            return await create_streaming_response(generator, "Jira comment generation")
        else:
            # Return non-streaming response
            result = await azure_ai_service.generate_jira_comment(
                task_description=request.task_description,
                task_type=request.task_type,
                context=request.context,
            )

            # Check if there was an error and handle it properly
            if result.get("error"):
                raise HTTPException(status_code=500, detail=result["error"])

            return JiraCommentResponse(**result)

    except Exception as e:
        logger.error(f"Jira comment generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/pr", response_model=None)
async def generate_github_pr_description(request: GitHubPRRequest):
    """Generate GitHub PR description using specialized AI prompt. Supports both streaming and non-streaming."""
    try:
        logger.info(f"Generating GitHub PR description for: {request.pr_title}, stream: {request.stream}")

        if request.stream:
            # Return streaming response
            generator = azure_ai_service.generate_github_pr_description_stream(
                pr_title=request.pr_title,
                code_changes=request.code_changes,
                branch_name=request.branch_name,
                commit_messages=request.commit_messages,
            )
            return await create_streaming_response(generator, "GitHub PR description generation")
        else:
            # Return non-streaming response
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
