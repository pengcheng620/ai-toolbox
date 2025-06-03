"""Chat API endpoints."""

import logging
from typing import List, Union, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.chat_service import chat_service
from app.utils.logger import get_logger
from app.utils.stream_handler import StreamableRequest, create_streaming_response

logger = get_logger(__name__)

router = APIRouter()


# Request models
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


class SimpleChatRequest(StreamableRequest):
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
@router.post("/stream", response_model=None)
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
            generator = chat_service.generate_chat_stream(
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
                result = await chat_service.generate_simple_chat(
                    message=last_message,
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


@router.post("/simple", response_model=None)
async def simple_chat(request: SimpleChatRequest):
    """Generate simple chat response. Supports both streaming and non-streaming based on stream parameter."""
    try:
        logger.info(f"Processing simple chat message: {len(request.message)} chars, stream: {request.stream}")

        if request.stream:
            # For streaming, convert to messages format and use chat stream
            messages = []
            if request.system_message:
                messages.append({"role": "system", "content": request.system_message})
            messages.append({"role": "user", "content": request.message})
            
            generator = chat_service.generate_chat_stream(
                messages=messages,
                model=request.model if request.model else None,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )
            return await create_streaming_response(generator, "Simple chat generation")
        else:
            # Return non-streaming response
            result = await chat_service.generate_simple_chat(
                message=request.message,
                system_message=request.system_message if request.system_message else None,
                model=request.model if request.model else None,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )
            return SimpleChatResponse(**result)

    except Exception as e:
        logger.error(f"Simple chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 