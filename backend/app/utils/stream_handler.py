"""Stream handling utilities for AI endpoints."""

import logging
from typing import Any, Dict, Callable, AsyncIterator, Union
from functools import wraps
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)


class StreamableRequest(BaseModel):
    """Base class for requests that support streaming."""
    
    stream: bool = False


async def create_streaming_response(
    generator: AsyncIterator[str],
    error_prefix: str = "AI generation"
) -> StreamingResponse:
    """
    Create a streaming response from an async generator.
    
    IMPORTANT: Encodes newlines in chunks for proper SSE transmission.
    Frontend will decode \\n back to \n for display in rich text editors.
    """
    
    async def generate():
        try:
            async for chunk in generator:
                # Chunks should already have encoded newlines as literal '\\n'
                # We just wrap them in SSE format
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"{error_prefix} streaming error: {str(e)}")
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


def streamable_endpoint(
    stream_method_name: str,
    non_stream_method_name: str,
    error_prefix: str = "AI generation"
):
    """
    Decorator to make an endpoint support both streaming and non-streaming responses.
    
    Args:
        stream_method_name: Name of the streaming method in the service
        non_stream_method_name: Name of the non-streaming method in the service
        error_prefix: Prefix for error messages
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args (assuming it's the first argument after self)
            request = None
            service = None
            
            for arg in args:
                if hasattr(arg, 'stream'):
                    request = arg
                elif hasattr(arg, stream_method_name) and hasattr(arg, non_stream_method_name):
                    service = arg
            
            if not request or not service:
                raise HTTPException(
                    status_code=500, 
                    detail="Invalid endpoint configuration for streaming"
                )
            
            try:
                if request.stream:
                    # Use streaming method
                    stream_method = getattr(service, stream_method_name)
                    generator = stream_method(**{
                        k: v for k, v in request.dict().items() 
                        if k != 'stream'
                    })
                    return await create_streaming_response(generator, error_prefix)
                else:
                    # Use non-streaming method
                    non_stream_method = getattr(service, non_stream_method_name)
                    result = await non_stream_method(**{
                        k: v for k, v in request.dict().items() 
                        if k != 'stream'
                    })
                    return result
                    
            except Exception as e:
                logger.error(f"{error_prefix} failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
                
        return wrapper
    return decorator


async def convert_to_stream(
    non_stream_result: Dict[str, Any],
    content_key: str = "text"
) -> AsyncIterator[str]:
    """
    Convert a non-streaming result to a streaming format.
    Useful for services that don't have native streaming support.
    """
    try:
        content = non_stream_result.get(content_key, "")
        if content:
            # Split content into chunks for streaming effect
            words = content.split()
            chunk_size = max(1, len(words) // 20)  # Aim for ~20 chunks
            
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size])
                if i + chunk_size < len(words):
                    chunk += " "
                yield chunk
        else:
            yield "No content generated"
            
    except Exception as e:
        logger.error(f"Stream conversion failed: {str(e)}")
        yield f"Error: {str(e)}" 