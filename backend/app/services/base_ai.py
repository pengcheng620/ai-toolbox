"""Base Azure AI service with client management."""

import logging
from typing import Dict, Any, Optional

from openai import AsyncAzureOpenAI
from langchain_openai import AzureChatOpenAI

from app.config import settings
from app.services.azure_oauth import oauth_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


class BaseAzureAIService:
    """Base Azure AI service with client management."""

    def __init__(self):
        """Initialize base Azure AI service."""
        self._azure_client: Optional[AsyncAzureOpenAI] = None
        self._langchain_client: Optional[AzureChatOpenAI] = None
        logger.info("Base Azure AI service initialized")

    async def _get_azure_client(self) -> AsyncAzureOpenAI:
        """Get Azure OpenAI client with token authentication."""
        if self._azure_client is None:
            if settings.use_oauth_auth:
                # Use OAuth token authentication
                token = await oauth_service.get_token()
                self._azure_client = AsyncAzureOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    azure_ad_token=token,
                    api_version=settings.azure_openai_api_version,
                )
                logger.info("Azure OpenAI client initialized with OAuth token")
            else:
                # Fallback to API key authentication
                self._azure_client = AsyncAzureOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    api_key=settings.azure_openai_api_key,
                    api_version=settings.azure_openai_api_version,
                )
                logger.info("Azure OpenAI client initialized with API key")

        return self._azure_client

    async def _get_langchain_client(self) -> AzureChatOpenAI:
        """Get LangChain Azure client with token authentication."""
        if self._langchain_client is None:
            if settings.use_oauth_auth:
                # Use OAuth token authentication
                token = await oauth_service.get_token()
                self._langchain_client = AzureChatOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    azure_ad_token=token,
                    api_version=settings.azure_openai_api_version,
                    deployment_name=settings.azure_openai_deployment_name,
                    temperature=0.7,
                )
                logger.info("LangChain Azure client initialized with OAuth token")
            else:
                # Fallback to API key authentication
                self._langchain_client = AzureChatOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    api_key=settings.azure_openai_api_key,
                    api_version=settings.azure_openai_api_version,
                    deployment_name=settings.azure_openai_deployment_name,
                    temperature=0.7,
                )
                logger.info("LangChain Azure client initialized with API key")

        return self._langchain_client

    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate text using Azure OpenAI with LangChain."""
        from langchain_core.messages import HumanMessage, SystemMessage

        try:
            model_name = model or settings.azure_openai_deployment_name

            # Prepare messages
            messages = []
            if system_message:
                messages.append(SystemMessage(content=system_message))
            messages.append(HumanMessage(content=prompt))

            # Get LangChain client and generate
            client = await self._get_langchain_client()

            # Update client parameters
            client.temperature = temperature
            client.max_tokens = max_tokens

            response = await client.ainvoke(messages)

            result = {
                "text": response.content,
                "model": model_name,
                "tokens_used": len(response.content.split()),  # Approximate
                "success": True,
            }

            logger.info(f"Text generated successfully using model {model_name}")
            return result

        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            return {
                "text": "",
                "model": model or settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def refresh_auth(self):
        """Refresh authentication tokens."""
        try:
            if settings.use_oauth_auth:
                oauth_service.clear_cache()
                await oauth_service.get_token()
                # Reset clients to force reinitialization with new token
                self._azure_client = None
                self._langchain_client = None
                logger.info("Authentication tokens refreshed")

        except Exception as e:
            logger.error(f"Auth refresh failed: {str(e)}")
            raise


# Global base AI service instance
base_ai_service = BaseAzureAIService() 