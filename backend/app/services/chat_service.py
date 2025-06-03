"""Chat service for AI-powered conversations."""

import logging
from typing import List, Dict, Any, Optional, AsyncIterator, Callable, TypedDict

from openai.types.chat import ChatCompletionMessageParam
from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.chat import chat_prompts

logger = get_logger(__name__)


class MessageDict(TypedDict):
    """Type definition for OpenAI message format."""
    role: str
    content: str


class ChatService(BaseAzureAIService):
    """Chat service for AI-powered conversations."""

    def __init__(self):
        """Initialize chat service."""
        super().__init__()
        logger.info("Chat service initialized")

    def _convert_to_openai_messages(self, messages: List[MessageDict]) -> List[ChatCompletionMessageParam]:
        """Convert message dicts to OpenAI format."""
        openai_messages: List[ChatCompletionMessageParam] = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                openai_messages.append({"role": "system", "content": content})
            elif role == "assistant":
                openai_messages.append({"role": "assistant", "content": content})
            else:  # default to user
                openai_messages.append({"role": "user", "content": content})
        
        return openai_messages

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
            message_dicts: List[MessageDict] = []
            for msg in messages:
                message_dicts.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            openai_messages = self._convert_to_openai_messages(message_dicts)

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
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

            # If generate_text failed, log the specific error
            if not result.get("success", False):
                logger.error(f"Base AI service failed: {result.get('error', 'Unknown error')}")
            
            return result

        except Exception as e:
            logger.error(f"Simple chat generation failed: {str(e)}")
            return {
                "text": "",
                "model": model or settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": f"Chat service error: {str(e)}",
            }


# Global chat service instance
chat_service = ChatService() 