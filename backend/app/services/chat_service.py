"""Chat service for AI-powered conversations."""

import logging
from typing import List, Dict, Any, Optional, AsyncIterator, Callable

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.chat import chat_prompts

logger = get_logger(__name__)


class ChatService(BaseAzureAIService):
    """Chat service for AI-powered conversations."""

    def __init__(self):
        """Initialize chat service."""
        super().__init__()
        logger.info("Chat service initialized")

    async def generate_chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Generate streaming chat responses using Azure OpenAI."""
        try:
            model_name = model or settings.azure_openai_deployment_name
            client = await self._get_azure_client()

            # Convert messages to OpenAI format
            openai_messages = []
            for msg in messages:
                openai_messages.append(
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                )

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Chat streaming failed: {str(e)}")
            yield f"Error: {str(e)}"

    async def generate_simple_chat(
        self,
        message: str,
        system_message: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """Generate a simple chat response (non-streaming)."""
        try:
            # Use prompt management for default system message
            prompt_config = chat_prompts.GENERAL
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(message)
            
            # Use provided system message or default from prompt config
            system_msg = system_message or str(prompt_config["system_message"])
            
            result = await self.generate_text(
                prompt=prompt,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_message=system_msg,
            )

            return result

        except Exception as e:
            logger.error(f"Simple chat generation failed: {str(e)}")
            return {
                "text": "",
                "model": model or settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }


# Global chat service instance
chat_service = ChatService() 