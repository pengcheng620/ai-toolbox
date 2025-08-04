# AI Toolbox Configuration Guide

This document explains how to configure the AI Toolbox for both development and production environments. Our configuration strategy is designed to be secure, flexible, and easy to manage.

## Core Principles

1.  **Centralized Backend Configuration**: The backend is the single source of truth for all configurations.
2.  **Dynamic Frontend Configuration**: The frontend fetches its configuration from the backend at runtime, eliminating the need to rebuild for configuration changes.
3.  **Separation of Config and Secrets**:
    -   **Non-sensitive config** is stored in version-controlled `.yml` files.
    -   **Sensitive secrets** (like API keys and passwords) are injected via environment variables and are never committed to Git.

## Configuration Hierarchy

The application loads configuration in the following order of precedence (lower numbers are overridden by higher numbers):

1.  **Default Values (in code)**: Hardcoded defaults in `backend/app/utils/config_loader.py`.
2.  **`config/common.yml`**: Base configuration shared across all environments.
3.  **`config/deployment.yml`**: Environment-specific overrides. This file is NOT committed to Git.
4.  **Environment Variables**: The highest priority, used for secrets and final overrides.

---

## Backend Configuration (`backend/.env`)

All sensitive information and environment-specific settings for the backend are managed in the `backend/.env` file. To get started, copy the template:

```bash
cp backend/env.production.template backend/.env
```

Then, edit `backend/.env` and provide the necessary values.

### Key Environment Variables

-   `AITOOLBOX_SERVICES_BACKEND_PORT`: The port the backend server will listen on (e.g., `8077`).
-   `AITOOLBOX_SECURITY_CORS_ORIGINS`: Comma-separated list of allowed CORS origins.
-   `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key.
-   `MS_OAUTH_CLIENT_SECRET`: Microsoft OAuth client secret.
-   `JIRA_API_TOKEN`: Your Jira API token.
-   `GITHUB_API_TOKEN`: Your GitHub API token.
-   `SECRET_KEY`: A secret key for signing sessions. Generate one with:
    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

---

## Frontend Configuration (`frontend/.env`)

The frontend has a much simpler configuration. It only needs to know the base URL of the backend API during development.

Create a `.env` file in the `frontend/` directory:

```bash
cp frontend/env.production.template frontend/.env
```

The file should contain:

```
# Points to your local backend server during development
PLASMO_PUBLIC_API_BASE_URL=http://localhost:8077 
```

### How It Works

1.  **During Development (`pnpm dev`)**: Plasmo reads `frontend/.env` and injects `PLASMO_PUBLIC_API_BASE_URL` into the running application.
2.  **For Production (`pnpm build`)**: The CI/CD pipeline (or your build process) must set the `PLASMO_PUBLIC_API_BASE_URL` environment variable to the **public URL of your deployed backend**. Plasmo will bake this URL into the final static files.

All other configurations needed by the frontend (feature flags, UI settings, etc.) are fetched dynamically from the backend's `/api/v1/config/public` endpoint after the application loads.
