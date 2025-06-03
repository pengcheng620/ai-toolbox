"""Azure OAuth token management service."""

import time
import logging
from typing import Optional
import httpx

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AzureOAuthService:
    """Azure OAuth token management service."""

    def __init__(self):
        """Initialize OAuth service."""
        self._cached_token: Optional[str] = None
        self._token_expiry_time: Optional[float] = None

        # OAuth configuration
        self.client_id = settings.ms_oauth_client_id
        self.client_secret = settings.ms_oauth_client_secret
        self.grant_type = settings.ms_oauth_grant_type
        self.scope = settings.ms_oauth_scope
        self.oauth_url = settings.ms_oauth_url

        logger.info("Azure OAuth service initialized")

    async def _fetch_oauth_token(self) -> str:
        """Fetch a new OAuth token from Azure."""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": self.grant_type,
            "scope": self.scope,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.oauth_url, data=data)

                if not response.is_success:
                    error_data = response.json()
                    error_msg = error_data.get("error_description", "Unknown error")
                    logger.error(f"OAuth token fetch failed: {error_msg}")
                    raise Exception(f"OAuth token fetch failed: {error_msg}")

                token_data = response.json()
                logger.info(
                    f"OAuth token fetched successfully at {time.strftime('%Y-%m-%d %H:%M:%S')}"
                )
                return token_data["access_token"]

        except httpx.RequestError as e:
            logger.error(f"OAuth request failed: {str(e)}")
            raise Exception(f"OAuth request failed: {str(e)}")
        except Exception as e:
            logger.error(f"OAuth token fetch failed: {str(e)}")
            raise

    def is_token_expiring(self, buffer_seconds: int = 300) -> bool:
        """Check if token is expiring within buffer_seconds (default 5 minutes)."""
        if not self._token_expiry_time:
            return True
        
        current_time = time.time()
        return current_time >= (self._token_expiry_time - buffer_seconds)

    async def get_token(self, force_refresh: bool = False) -> str:
        """Get valid OAuth token (cached or fetch new)."""
        current_time = time.time()

        # Check if we need to refresh token
        should_refresh = (
            force_refresh or
            not self._cached_token or
            not self._token_expiry_time or
            current_time >= self._token_expiry_time
        )

        if not should_refresh:
            logger.debug("Using cached OAuth token")
            return self._cached_token  # type: ignore

        # Fetch new token
        logger.info("Fetching new OAuth token")
        try:
            self._cached_token = await self._fetch_oauth_token()
            self._token_expiry_time = current_time + 3600  # 1 hour validity
            logger.info("OAuth token refreshed successfully")
            return self._cached_token
        except Exception as e:
            logger.error(f"Failed to refresh OAuth token: {str(e)}")
            # Clear cache on failure
            self.clear_cache()
            raise

    def clear_cache(self):
        """Clear cached token."""
        self._cached_token = None
        self._token_expiry_time = None
        logger.info("OAuth token cache cleared")


# Global OAuth service instance
oauth_service = AzureOAuthService()
