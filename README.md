# AI Toolbox

A comprehensive AI-powered development toolkit offering real-time streaming responses, secure authentication, and dedicated Jira and GitHub workflow tools.

## 🚀 Core Features

- **Real-time Streaming Response**: Typing effect AI responses for enhanced user experience
- **Secure Authentication**: Microsoft OAuth 2.0 automatic token refresh
- **Jira Integration**: AI-driven task comment generation with streaming output
- **GitHub Integration**: Intelligent PR description generation
- **Browser Extension**: Chrome extension for seamless workflow integration
- **Modular Architecture**: Clear separation of frontend and backend

## 📁 Project Structure

```
ai-toolbox/
├── backend/                 # FastAPI backend service
│   ├── app/                # Application code
│   │   ├── api/           # API route handlers
│   │   ├── services/      # Business logic services
│   │   └── utils/         # Utility functions
│   ├── tests/             # Backend tests
│   ├── pyproject.toml     # Python dependency management
│   └── README.md         # Backend documentation
├── frontend/              # Plasmo browser extension
│   ├── src/              # Source code
│   ├── background/       # Background scripts
│   ├── package.json      # Frontend dependencies (pnpm)
│   └── README.md         # Frontend documentation
└── README.md             # This file
```

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI + Uvicorn
- **AI Service**: Azure OpenAI + OAuth 2.0
- **Authentication**: Microsoft OAuth client credentials flow
- **Data Validation**: Pydantic v2
- **Language**: Python 3.11+
- **Package Management**: uv

### Frontend (Browser Extension)
- **Framework**: Plasmo + React + TypeScript
- **Build Tool**: Plasmo Framework
- **Styling**: Tailwind CSS + Mantine UI
- **Package Management**: pnpm
- **Extension Type**: Manifest V3

## 🚀 Quick Start

### Requirements

- Python 3.11+
- Node.js 18+ and pnpm
- Azure OpenAI access and OAuth setup

### Backend Setup

1. **Enter backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   # Using uv (recommended)
   uv sync

   # Or using pip
   pip install -e .
   ```

3. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env file to configure Azure and OAuth info
   ```

4. **Run backend**:
   ```bash
   uv run run_dev.py
   ```

### Browser Extension Setup

1. **Enter frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Development mode**:
   ```bash
   pnpm dev
   ```

4. **Build extension**:
   ```bash
   pnpm build
   # Load the build folder in Chrome developer mode
   ```

## 🔧 Configuration

### Azure OpenAI Setup

1. **Create Azure OpenAI resource**
2. **Register Azure AD application**
3. **Configure environment variables**

For detailed configuration steps, see [backend/README.md](./backend/README.md)

## 🌟 Main Features

### 1. Jira Task Comment Generation
- Intelligent task comment generation
- Supports real-time streaming output
- Typing effect for enhanced user experience

### 2. GitHub PR Description Generation
- Automatic PR description generation
- Intelligent analysis based on code changes
- Supports streaming response

### 3. General Text Generation
- Flexible AI text generation
- Configurable parameters (temperature, max tokens, etc.)
- Suitable for various use cases

## 🔄 Development Workflow

### Backend Development
```bash
cd backend
uv sync                    # Install dependencies
uv run run_dev.py          # Start development server
```

### Extension Development
```bash
cd frontend
pnpm install              # Install dependencies
pnpm dev                  # Development mode
pnpm build                # Build extension
```

## 📊 API Documentation

After backend is running, access API docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/ai/health

### Main Endpoints
- `POST /api/v1/ai/jira/generate` - Jira comment generation (streaming supported)
- `POST /api/v1/ai/github/pr-description` - GitHub PR description
- `POST /api/v1/ai/generate` - General text generation
- `GET /api/v1/ai/health` - Service health status

## 📚 Related Documentation

- [Backend Documentation](./backend/README.md) - Detailed backend API and configuration
- [Frontend Documentation](./frontend/README.md) - Browser extension development guide

## 🤝 Contribution

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes and write tests
4. Ensure all tests pass
5. Submit a Pull Request

## 📝 License

[Your License Here]

---

**Note**: This project focuses on AI-powered development tools and real-time user experience, and is under active development.

