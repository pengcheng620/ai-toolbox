# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Python/FastAPI)
```bash
cd backend
uv sync                    # Install dependencies
uv run run_dev.py         # Start development server
uv run run_prod.py        # Start production server
```

### Frontend (Plasmo Browser Extension)
```bash
cd frontend
pnpm install              # Install dependencies
pnpm dev                  # Chrome development build
pnpm dev:firefox          # Firefox development build
pnpm build                # Chrome production build
pnpm build:firefox        # Firefox production build
pnpm package             # Package Chrome extension
pnpm package:firefox     # Package Firefox extension
```

### Linting & Type Checking
Backend uses Black, isort, and mypy (configured in pyproject.toml):
```bash
cd backend
uv run black .
uv run isort .
uv run mypy .
```

Frontend uses TypeScript compiler:
```bash
cd frontend
npx tsc --noEmit         # Type check without build
```

## Architecture Overview

### 3-Layer Simplified Architecture (Frontend)
```
Components Layer    → React UI components with business logic
    ↓
Hooks Layer        → Reusable streaming hooks (useStreamBase pattern)
    ↓
Background Layer   → Auto-routing service worker + API communication
```

### Key Principles
- **Convention over Configuration**: Auto-routing based on `service-action` naming
- **Hook-First Development**: All business logic in custom hooks using `useStreamBase` pattern
- **Centralized Configuration**: Backend serves dynamic config via `/api/v1/config/public`

### Backend Structure
- **FastAPI** with modular router structure under `app/api/`
- **Configuration Management**: Hierarchical config loading (code defaults → `config/common.yml` → `config/deployment.yml` → env vars)
- **AI Services**: Modular AI endpoints for Jira, GitHub, chat, and sprint planning
- **Streaming Support**: Real-time streaming responses for AI operations

### Frontend Structure
- **Plasmo Framework**: Chrome extension with React/TypeScript
- **Auto-routing Background Worker**: Handles all service communication via `service-action` port naming
- **Content Scripts**: Inject components directly into GitHub/Jira pages
- **Unified Hook Pattern**: All API calls through `useStreamBase` derivatives

## Key Patterns

### Adding New Features (Frontend)
1. Configure endpoint in `frontend/src/config/streaming.ts`
2. Create hook in `frontend/src/hooks/[service]/`
3. Use hook in component

Example:
```typescript
// 1. Config
export const STREAMING_CONFIG = {
  newService: {
    'action-name': '/api/newservice/action'
  }
}

// 2. Hook
export const useNewServiceAction = () => useStreamBase('newService', 'action-name')

// 3. Component usage
const { data, loading, error, execute } = useNewServiceAction()
```

### Backend API Pattern
- All routes follow `/api/v1/[service]/[action]` structure
- Streaming endpoints use SSE (Server-Sent Events)
- Authentication via Microsoft OAuth 2.0
- CORS configured for extension communication

## Configuration Management

### Environment Setup
Backend secrets in `backend/.env` (copy from `backend/env.production.template`)
Frontend config in `frontend/.env` with `PLASMO_PUBLIC_API_BASE_URL`

### Important Config Files
- `config/common.yml`: Shared configuration
- `backend/app/config.py`: Pydantic settings with environment variable binding
- `frontend/src/config/streaming.ts`: API endpoint mapping

## Deployment

### Development
Run backend and frontend in separate terminals. Extension loads from `build/chrome-mv3-dev/` or `build/firefox-mv2-dev/`

### Production
Use deployment scripts:
- Linux/macOS: `./scripts/deploy.sh`
- Windows: `./scripts/deploy.ps1`

Both use `docker-compose.prod.yml` for containerized deployment.

## Testing

Backend uses pytest (configured in pyproject.toml):
```bash
cd backend
uv run pytest
```

No specific test framework configured for frontend - check for existing test patterns before adding tests.

## Technology Stack

### Backend
- FastAPI + Uvicorn
- Python 3.11+ with uv package manager
- Azure OpenAI for AI services
- SQLAlchemy for data (when used)
- Microsoft OAuth 2.0 authentication

### Frontend
- Plasmo framework (Chrome extension)
- React + TypeScript
- Tailwind CSS + Mantine UI components
- pnpm package manager
- Chrome Manifest V3 (V2 for Firefox)