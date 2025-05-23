"""Chat API endpoints."""

import logging
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.chat_service import chat_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
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


class SimpleChatRequest(BaseModel):
    """Request model for simple chat."""

    message: str = Field(..., description="User message")
    system_message: str = Field(default="", description="System message (optional)")
    model: str = Field(default="", description="Model to use (optional)")
    max_tokens: int = Field(
        default=1000, ge=1, le=4000, description="Maximum tokens to generate"
    )
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Generation temperature"
    )


# Response models
class SimpleChatResponse(BaseModel):
    """Response model for simple chat."""

    text: str
    model: str
    tokens_used: int
    success: bool
    error: str = ""


# Endpoints
@router.post("/stream")
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
                async for chunk in chat_service.generate_chat_stream(
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


@router.post("/simple", response_model=SimpleChatResponse)
async def simple_chat(request: SimpleChatRequest):
    """Generate simple chat response (non-streaming)."""
    try:
        logger.info(f"Processing simple chat message: {len(request.message)} chars")

        result = await chat_service.generate_simple_chat(
            message=request.message,
            system_message=request.system_message or None,
            model=request.model or None,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        )

        return SimpleChatResponse(**result)

    except Exception as e:
        logger.error(f"Simple chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 