# AI Toolbox Backend

A FastAPI-based backend service for AI-powered development tools with Azure OpenAI integration, featuring real-time streaming responses and secure OAuth authentication.

This document focuses on backend-specific development details. For project overview, installation, and general configuration, please see the [root README.md](../README.md).

## Core Backend Features

-   **Azure OpenAI Integration**: Seamless integration with Azure OpenAI services using OAuth 2.0.
-   **Real-time Streaming**: Server-Sent Events (SSE) for typewriter-effect responses.
-   **Secure Authentication**: Microsoft OAuth 2.0 client credentials flow with automatic token refresh.
-   **Centralized Configuration**: All settings are managed via a unified configuration loader. For details, see [CONFIGURATION.md](../CONFIGURATION.md).

## API Endpoints

-   `GET /health`: Service health status.
-   `GET /api/v1/config/public`: Provides public, non-sensitive configuration to the frontend.
-   `POST /api/v1/ai/generate`: Generic text generation with streaming support.
-   `POST /api/v1/ai/jira/generate`: Generate Jira task summaries with streaming support.
-   `POST /api/v1/ai/github/pr-description`: Generate PR descriptions with streaming support.

_For a complete, interactive API specification, run the server and visit `http://localhost:8077/docs`._

## Environment Configuration

All backend configuration is managed through a combination of YAML files and environment variables, loaded by a central `ConfigLoader`.

**For a full guide on how to set up your `.env` file and configure the application, please refer to the main [CONFIGURATION.md](../CONFIGURATION.md) file.**

## Backend Development

### Project Structure
```
backend/
├── app/
│   ├── api/              # API route handlers
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions (incl. config_loader.py)
│   └── main.py           # FastAPI application
├── tests/                # Pytest tests
├── pyproject.toml        # Python dependency management (uv)
└── env.production.template # Environment variable template
```

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app
```

### Code Quality
```bash
# Format code with Black
black app/

# Lint with flake8
flake8 app/

# Type check with mypy
mypy app/
```

## Troubleshooting

### Common Issues

-   **Authentication Failed**: Verify all `MS_OAUTH_*` and `AZURE_*` variables in your `backend/.env` are correct. Ensure the Azure AD application has the `Cognitive Services User` permission granted.
-   **CORS Issues**: If the frontend is blocked, ensure its origin URL is included in the `AITOOLBOX_SECURITY_CORS_ORIGINS` variable in your `backend/.env`.
-   **Streaming Not Working**: Use `curl -N` to test streaming endpoints directly from your terminal to isolate frontend issues.

_For more detailed troubleshooting, refer to the logs and enable debug mode via environment variables as described in `CONFIGURATION.md`._
