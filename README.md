# AI Toolbox

A comprehensive AI-powered development toolkit offering real-time streaming responses, secure authentication, and dedicated Jira and GitHub workflow tools.

## 🚀 Core Features

-   **Real-time Streaming Response**: Typing effect AI responses for enhanced user experience.
-   **Secure Authentication**: Microsoft OAuth 2.0 automatic token refresh.
-   **Jira Integration**: AI-driven task comment generation with streaming output.
-   **GitHub Integration**: Intelligent PR description generation.
-   **Browser Extension**: Chrome and Firefox extension for seamless workflow integration.
-   **Modular Architecture**: Clear separation of frontend and backend with a robust, centralized configuration.

## 📁 Project Structure

```
ai-toolbox/
├── backend/                 # FastAPI backend service
├── frontend/              # Plasmo browser extension
├── config/                  # Non-sensitive configuration files
│   ├── common.yml
│   └── deployment.yml.template
├── scripts/                 # Helper scripts
└── CONFIGURATION.md         # Detailed configuration guide
```

## 🛠 Tech Stack

### Backend
-   **Framework**: FastAPI + Uvicorn
-   **Language**: Python 3.11+
-   **Package Management**: uv
-   **Authentication**: Microsoft OAuth 2.0

### Frontend (Browser Extension)
-   **Framework**: Plasmo + React + TypeScript
-   **Styling**: Tailwind CSS + Mantine UI
-   **Package Management**: pnpm
-   **Browser Support**: Chrome, Firefox, Edge, and other Chromium-based browsers
-   **Manifest**: V3 (Chrome/Edge), V2 (Firefox)

---

## 🚀 Quick Start

### Prerequisites

-   Python 3.11+ & `uv`
-   Node.js 18+ & `pnpm`
-   Docker and Docker Compose
-   Access to required services (Azure, Jira, etc.)

### 1. Configure the Application

Before running the services, you need to set up your configuration. All sensitive information is managed through `.env` files.

**For a complete guide, please read [CONFIGURATION.md](./CONFIGURATION.md) first.**

1.  **Backend Secrets**: Copy `backend/env.production.template` to `backend/.env` and fill in your secrets.
    ```bash
    cp backend/env.production.template backend/.env
    # Now edit backend/.env
    ```
2.  **Frontend Dev Environment**: Copy `frontend/env.production.template` to `frontend/.env`. The default value pointing to `http://localhost:8077` is usually sufficient for local development.
    ```bash
    cp frontend/env.production.template frontend/.env
    ```

### 2. Run in Development Mode

Run the backend and frontend services in separate terminals.

**Terminal 1: Start Backend**
```bash
cd backend
uv sync
uv run run_dev.py
```

**Terminal 2: Start Frontend**
```bash
cd frontend
pnpm install

# For Chrome development (default)
pnpm dev

# For Firefox development
pnpm dev:firefox
```

**Loading the Extension:**

*For Chrome:*
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select `build/chrome-mv3-dev` directory

*For Firefox:*
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on..."
4. Navigate to `build/firefox-mv2-dev` directory and select `manifest.json`

---

## 🔧 Configuration

All configuration is managed centrally by the backend. For a detailed explanation of the configuration hierarchy, environment variables, and how to manage settings, **please refer to [CONFIGURATION.md](./CONFIGURATION.md)**.

---

## 🚀 Production Deployment

This project is set up for Docker-based deployments.

### Running Locally in Production Mode

You can simulate the production environment on your local machine using our simplified helper scripts. This is useful for final testing before a real deployment.

1.  **Ensure `backend/.env` is configured** with your production-like values.
2.  **Run the script for your OS**:

    **For Linux/macOS/WSL:**
    ```bash
    ./scripts/deploy.sh
    ```
    **For Windows PowerShell:**
    ```powershell
    ./scripts/deploy.ps1
    ```
These scripts will build the Docker images and start all services using `docker-compose.prod.yml`.

### Browser Extension Builds

For production deployment of the browser extension, you can build for specific browsers:

```bash
cd frontend

# Build for Chrome (Manifest V3)
pnpm build

# Build for Firefox (Manifest V2)
pnpm build:firefox

# Package for distribution
pnpm package          # Chrome package
pnpm package:firefox  # Firefox package
```

The packaged extensions will be available in the `build/` directory and can be submitted to the respective browser stores.

### True Production Deployment (CI/CD)

A true production deployment should be handled by a CI/CD pipeline (e.g., GitHub Actions). The pipeline would be responsible for:
1.  Securely providing the production `backend/.env` secrets.
2.  Setting the `PLASMO_PUBLIC_API_BASE_URL` environment variable to the public backend URL.
3.  Building the frontend and backend Docker images.
4.  Pushing the images to a registry and deploying them to your server.

---

## 📊 API Documentation

After the backend is running, access the API docs at `http://localhost:8077/docs` (the port may vary based on your configuration).

## 🤝 Contribution

1.  Fork this repository.
2.  Create a feature branch: `git checkout -b feature/your-feature`.
3.  Commit changes and write tests.
4.  Submit a Pull Request.
