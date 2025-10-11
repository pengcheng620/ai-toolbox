"""Base Azure AI service with client management."""

import logging
from typing import Dict, Any, Optional, AsyncIterator

from openai import AsyncAzureOpenAI
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

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
        """Get Azure OpenAI client with OAuth Bearer token authentication."""
        # Check if we need to refresh the client due to token expiring
        if self._azure_client is not None and oauth_service.is_token_expiring():
            logger.info("Token is expiring, refreshing Azure OpenAI client")
            self._azure_client = None

        if self._azure_client is None:
            # Always use OAuth token authentication
            token = await oauth_service.get_token()
            self._azure_client = AsyncAzureOpenAI(
                azure_endpoint=settings.azure_openai_endpoint,
                azure_ad_token=token,
                api_version=settings.azure_openai_api_version,
            )
            logger.info("Azure OpenAI client initialized with OAuth token")

        return self._azure_client

    async def _get_langchain_client(self) -> AzureChatOpenAI:
        """Get LangChain Azure client with OAuth Bearer token authentication."""
        # Check if we need to refresh the client due to token expiring
        if self._langchain_client is not None and oauth_service.is_token_expiring():
            logger.info("Token is expiring, refreshing LangChain client")
            self._langchain_client = None

        if self._langchain_client is None:
            # Always use OAuth token authentication
            token = await oauth_service.get_token()

            # Check if the model is o3-mini which doesn't support temperature
            deployment_name = settings.azure_openai_deployment_name
            client_params = {
                "azure_endpoint": settings.azure_openai_endpoint,
                "azure_ad_token": SecretStr(token),
                "api_version": settings.azure_openai_api_version,
                "azure_deployment": deployment_name,
            }

            # Only set temperature for models that support it
            if "o3" not in deployment_name.lower():
                client_params["temperature"] = 0.7

            self._langchain_client = AzureChatOpenAI(**client_params)
            logger.info("LangChain Azure client initialized with OAuth token")

        return self._langchain_client

    def _is_auth_error(self, error_str: str) -> bool:
        """Check if error is related to authentication."""
        auth_error_indicators = [
            "401",
            "unauthorized",
            "authentication",
            "invalid_token",
            "token_expired",
            "access_denied",
            "forbidden"
        ]
        error_lower = error_str.lower()
        return any(indicator in error_lower for indicator in auth_error_indicators)

    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system_message: Optional[str] = None,
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        """Generate text using Azure OpenAI with LangChain."""
        from langchain_core.messages import HumanMessage, SystemMessage

        model_name = model or settings.azure_openai_deployment_name
        
        for attempt in range(max_retries + 1):
            try:
                # Prepare messages
                messages: list = []
                if system_message:
                    messages.append(SystemMessage(content=system_message))
                messages.append(HumanMessage(content=prompt))

                # Get LangChain client and generate
                client = await self._get_langchain_client()

                # Update client parameters
                # o3-mini model doesn't support temperature parameter
                model_name = model or settings.azure_openai_deployment_name

                # For newer models like o3-mini, use bind to set max_completion_tokens
                # and exclude temperature if it's an o3 model
                if "o3" in model_name.lower():
                    bound_client = client.bind(max_completion_tokens=max_tokens)
                else:
                    client.temperature = temperature
                    bound_client = client.bind(max_completion_tokens=max_tokens, temperature=temperature)

                response = await bound_client.ainvoke(messages)

                result = {
                    "text": response.content,
                    "model": model_name,
                    "tokens_used": len(str(response.content).split()),  # Approximate
                    "success": True,
                }

                logger.info(f"Text generated successfully using model {model_name}")
                return result

            except Exception as e:
                error_str = str(e)
                logger.error(f"Text generation attempt {attempt + 1} failed: {error_str}")
                
                # Check if this is an authentication error and we have retries left
                if self._is_auth_error(error_str) and attempt < max_retries:
                    logger.info(f"Authentication error detected, refreshing auth and retrying (attempt {attempt + 1}/{max_retries})")
                    try:
                        await self.refresh_auth()
                        continue  # Retry with new token
                    except Exception as refresh_error:
                        logger.error(f"Auth refresh failed: {str(refresh_error)}")
                        # Continue to final error handling
                
                # If this is the last attempt or not an auth error, return error
                if attempt == max_retries:
                    logger.error(f"All {max_retries + 1} attempts failed for text generation")
                    return {
                        "text": "",
                        "model": model_name,
                        "tokens_used": 0,
                        "success": False,
                        "error": f"Connection error: {error_str}",
                    }

        # This should never be reached, but just in case
        return {
            "text": "",
            "model": model_name,
            "tokens_used": 0,
            "success": False,
            "error": "Unexpected error in retry loop",
        }

    async def generate_text_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system_message: Optional[str] = None,
        max_retries: int = 2,
        use_langchain: bool = True,  # NEW: Default to LangChain for testing
    ) -> AsyncIterator[str]:
        """Generate streaming text using LangChain or Azure SDK with OAuth."""
        model_name = model or settings.azure_openai_deployment_name

        for attempt in range(max_retries + 1):
            try:
                if use_langchain:
                    # Use LangChain streaming - produces literal \\n automatically
                    from langchain_core.messages import HumanMessage, SystemMessage
                    
                    client = await self._get_langchain_client()
                    
                    # Prepare LangChain messages
                    messages = []
                    if system_message:
                        messages.append(SystemMessage(content=system_message))
                    messages.append(HumanMessage(content=prompt))
                    
                    # LangChain's astream produces chunks with literal \\n for newlines
                    # No conversion needed - already in correct format for SSE
                    async for chunk in client.astream(messages):
                        if chunk.content:
                            yield chunk.content
                    
                    logger.info(f"LangChain streaming completed using model {model_name}")
                    return
                else:
                    # Use Azure SDK - produces real \n (0x0A)
                    client = await self._get_azure_client()

                    # Prepare messages
                    messages = []
                    if system_message:
                        messages.append({"role": "system", "content": system_message})
                    messages.append({"role": "user", "content": prompt})

                    # Create streaming completion using Azure SDK
                    response = await client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stream=True
                    )

                    # Azure SDK produces chunks with real \n (0x0A) characters
                    # Convert to literal \\n for SSE transmission
                    async for chunk in response:
                        if chunk.choices and chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            # Convert real newlines to literal string for SSE
                            if '\n' in content:
                                content = content.replace('\n', '\\n')
                            yield content

                    logger.info(f"Azure SDK streaming completed using model {model_name}")
                    return

            except Exception as e:
                error_str = str(e)
                method = "LangChain" if use_langchain else "Azure SDK"
                logger.error(f"{method} streaming attempt {attempt + 1} failed: {error_str}")

                # Check if this is an authentication error and we have retries left
                if self._is_auth_error(error_str) and attempt < max_retries:
                    logger.info(f"Authentication error detected, refreshing client (attempt {attempt + 1}/{max_retries})")
                    try:
                        await self.refresh_auth()
                        continue  # Retry with new token
                    except Exception as refresh_error:
                        logger.error(f"Auth refresh failed: {str(refresh_error)}")

                # If this is the last attempt or not an auth error, raise error
                if attempt == max_retries:
                    logger.error(f"All {max_retries + 1} attempts failed")
                    raise Exception(f"Streaming generation failed: {error_str}")

    async def refresh_auth(self):
        """Refresh OAuth authentication tokens."""
        try:
            # Force refresh the token
            await oauth_service.get_token(force_refresh=True)
            # Reset clients to force reinitialization with new token
            self._azure_client = None
            self._langchain_client = None
            logger.info("OAuth authentication tokens refreshed")

        except Exception as e:
            logger.error(f"Auth refresh failed: {str(e)}")
            raise


# Global base AI service instance
base_ai_service = BaseAzureAIService()