"""Pytest configuration."""

import os
import pytest
from unittest.mock import patch

# Set test environment variables before importing the app
os.environ.update({
    "APP_NAME": "AI Toolbox Backend Test",
    "ENVIRONMENT": "test",
    "SECRET_KEY": "test-secret-key-12345",
    "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com/",
    "AZURE_OPENAI_API_KEY": "test-api-key",
    "JWT_SECRET_KEY": "test-jwt-secret-key-12345",
    "ALLOWED_HOSTS": "localhost,127.0.0.1",
    "CORS_ORIGINS": "chrome-extension://*,http://localhost:3000",
    "ENABLE_CACHING": "false",
    "ENABLE_RATE_LIMITING": "false",
    "ENABLE_METRICS": "false",
})


@pytest.fixture(scope="session", autouse=True)
def mock_azure_ai_service():
    """Mock the Azure AI service for testing."""
    with patch("app.services.azure_ai.AzureAIService") as mock_service:
        # Mock the service methods
        mock_instance = mock_service.return_value
        mock_instance.generate_text.return_value = {
            "text": "Test generated text",
            "model": "test-model",
            "tokens_used": 10,
            "success": True,
        }
        mock_instance.generate_jira_comment.return_value = {
            "generated_content": "Test Jira comment",
            "suggestions": [],
            "model": "test-model",
            "tokens_used": 10,
        }
        mock_instance.generate_github_pr_description.return_value = {
            "generated_description": "Test PR description",
            "suggested_title": "Test PR Title",
            "model": "test-model",
            "tokens_used": 10,
        }
        yield mock_service


@pytest.fixture
def anyio_backend():
    """Use asyncio backend for anyio."""
    return "asyncio" 