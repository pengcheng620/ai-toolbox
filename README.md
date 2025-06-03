# AI Toolbox

A comprehensive AI-powered development toolkit featuring real-time streaming responses, secure authentication, and specialized tools for Jira and GitHub workflows.

## 🚀 Key Features

- **Real-time Streaming**: Typewriter-effect responses for enhanced user experience
- **Secure Authentication**: Microsoft OAuth 2.0 with automatic token refresh
- **Jira Integration**: AI-powered task comment generation with streaming support
- **GitHub Integration**: Intelligent PR description generation
- **Browser Extension**: Chrome extension for seamless workflow integration
- **Modular Architecture**: Clean separation between frontend and backend services

## 📁 Project Structure

```
ai-toolbox/
├── backend/                 # FastAPI backend service
│   ├── app/                # Application code
│   │   ├── api/           # API route handlers
│   │   ├── services/      # Business logic services
│   │   └── utils/         # Utility functions
│   ├── tests/             # Backend tests
│   ├── requirements.txt   # Python dependencies
│   └── README.md         # Backend documentation
├── frontend/              # Frontend application (planned)
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── README.md         # Frontend documentation
├── extension/             # Browser extension
│   ├── manifest.json     # Extension manifest
│   ├── src/              # Extension source code
│   └── README.md         # Extension documentation
├── lib/                   # Shared libraries
│   ├── ai/               # AI service utilities
│   └── models/           # Shared data models
└── README.md             # This file
```

## 🛠 Technology Stack

### Backend
- **Framework**: FastAPI with Uvicorn
- **AI Services**: Azure OpenAI with OAuth 2.0
- **Authentication**: Microsoft OAuth client credentials flow
- **Data Validation**: Pydantic v2
- **Language**: Python 3.11+

### Frontend (Planned)
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Fetch API with streaming support

### Browser Extension
- **Manifest**: V3
- **Content Scripts**: TypeScript
- **Background Service**: Service Worker
- **UI Framework**: React (injected)

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18+ (for frontend development)
- Azure OpenAI access with OAuth setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Azure and OAuth configuration
   ```

5. **Run the backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup (Coming Soon)

```bash
cd frontend
npm install
npm run dev
```

### Browser Extension Setup

```bash
cd extension
npm install
npm run build
# Load unpacked extension in Chrome developer mode
```

## 🔧 Configuration

### Azure OpenAI Setup

1. **Create Azure OpenAI Resource**:
   - Go to Azure Portal
   - Create new Azure OpenAI resource
   - Deploy a GPT-4 model (e.g., gpt-4o)

2. **Register Azure AD Application**:
   - Go to Azure Active Directory > App registrations
   - Create new registration
   - Generate client secret
   - Configure API permissions for Azure Cognitive Services

3. **Update Environment Variables**:
   ```env
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

   # OAuth Configuration
   MS_OAUTH_CLIENT_ID=your-client-id
   MS_OAUTH_CLIENT_SECRET=your-client-secret
   MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token
   ```

## 🌟 Main Features

### 1. Jira Comment Generation with Streaming

Generate intelligent task comments with real-time typewriter effect:

```javascript
// Non-streaming (traditional)
const response = await fetch('/api/v1/ai/jira/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_description: "Implement user authentication",
    task_type: "feature",
    context: { priority: "high" },
    stream: false
  })
});

// Streaming (real-time typewriter effect)
const streamResponse = await fetch('/api/v1/ai/jira/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_description: "Implement user authentication",
    task_type: "feature",
    context: { priority: "high" },
    stream: true
  })
});

const reader = streamResponse.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = new TextDecoder().decode(value);
  // Process streaming data for typewriter effect
  displayChunk(chunk);
}
```

### 2. GitHub PR Description Generation

Intelligent PR descriptions with streaming support:

```javascript
const response = await fetch('/api/v1/ai/github/pr-description', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pr_title: "Add user authentication",
    code_changes: "...",
    branch_name: "feature/auth",
    stream: true
  })
});
```

### 3. Universal Text Generation

Flexible text generation for any use case:

```javascript
const response = await fetch('/api/v1/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Explain the benefits of microservices",
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  })
});
```

## 🔄 Development Workflow

### Backend Development

1. **Make changes** to backend code in `backend/app/`
2. **Run tests**: `pytest`
3. **Check code quality**: `black app/ && flake8 app/`
4. **Test API endpoints** using Swagger UI at http://localhost:8000/docs

### Frontend Development (Planned)

1. **Make changes** to frontend code in `frontend/src/`
2. **Run development server**: `npm run dev`
3. **Run tests**: `npm test`
4. **Build for production**: `npm run build`

### Extension Development

1. **Make changes** to extension code in `extension/src/`
2. **Build extension**: `npm run build`
3. **Reload extension** in Chrome developer mode
4. **Test functionality** on target websites

## 📊 API Documentation

Once the backend is running, access comprehensive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/ai/health

### Key Endpoints

- `POST /api/v1/ai/jira/generate` - Jira comment generation (streaming supported)
- `POST /api/v1/ai/github/pr-description` - GitHub PR descriptions
- `POST /api/v1/ai/generate` - Universal text generation
- `GET /api/v1/ai/health` - Service health and authentication status

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest                          # Run all tests
pytest --cov=app               # Run with coverage
pytest tests/test_streaming.py # Test streaming functionality
```

### Frontend Tests (Planned)

```bash
cd frontend
npm test                       # Run unit tests
npm run test:e2e              # Run end-to-end tests
```

### Integration Tests

```bash
# Test full workflow
curl -X POST "http://localhost:8000/api/v1/ai/jira/generate" \
  -H "Content-Type: application/json" \
  -d '{"task_description": "Test task", "stream": true}' \
  --no-buffer
```

## 🚀 Deployment

### Backend Deployment

```bash
# Using Docker
docker build -t ai-toolbox-backend ./backend
docker run -p 8000:8000 --env-file backend/.env ai-toolbox-backend

# Using direct deployment
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Deployment (Planned)

```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

## 🔄 Frontend Restructuring (Planned)

### Overview
The project is planned to be restructured to separate frontend and backend concerns more clearly. Currently, the browser extension serves as the primary frontend, but a dedicated web frontend will be added.

### Planned Structure
```
ai-toolbox/
├── backend/           # FastAPI backend (current)
├── frontend/          # React web application (planned)
├── extension/         # Browser extension (current)
└── shared/           # Shared utilities and types
```

### Migration Plan

1. **Phase 1**: Extract shared utilities to `shared/` directory
2. **Phase 2**: Create standalone React frontend in `frontend/`
3. **Phase 3**: Refactor extension to use shared components
4. **Phase 4**: Implement unified build and deployment pipeline

### Potential Risks and Mitigation

#### 1. Relative Path Issues
**Risk**: Moving files may break relative imports
**Mitigation**:
- Use absolute imports with path mapping
- Update tsconfig.json and build configurations
- Implement comprehensive testing before migration

#### 2. Build Script Dependencies
**Risk**: Build scripts may reference incorrect paths
**Mitigation**:
- Update package.json scripts to use correct working directories
- Use workspace-aware build tools (e.g., npm workspaces, lerna)
- Test build processes in isolated environments

#### 3. Development Environment Configuration
**Risk**: Development servers and hot reload may break
**Mitigation**:
- Update development server configurations
- Ensure proper proxy settings for API calls
- Maintain separate development scripts for each component

#### 4. Shared Dependencies
**Risk**: Version conflicts between frontend and extension
**Mitigation**:
- Use workspace package management
- Maintain consistent dependency versions
- Implement dependency audit processes

#### 5. Type Definitions
**Risk**: Shared types may become inconsistent
**Mitigation**:
- Create shared type definitions in `shared/types/`
- Use TypeScript project references
- Implement type checking in CI/CD pipeline

### Development Workflow Changes

#### Current Workflow
```bash
# Extension development
npm run dev          # Builds extension
npm run build        # Production build

# Backend development
cd backend
uvicorn app.main:app --reload
```

#### Planned Workflow
```bash
# Root level commands
npm run dev:frontend    # Start React dev server
npm run dev:extension   # Build extension in watch mode
npm run dev:backend     # Start backend server
npm run dev:all         # Start all services

# Individual component development
cd frontend && npm run dev
cd extension && npm run dev
cd backend && uvicorn app.main:app --reload
```

## 🔒 Security Considerations

- **OAuth Tokens**: Automatically refreshed and secured in memory
- **Environment Variables**: Never commit `.env` files
- **CORS**: Properly configured for specific domains
- **HTTPS**: Required for production deployments
- **API Keys**: Use OAuth instead of long-lived API keys

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** with proper tests
4. **Ensure all tests pass**: `pytest` (backend) and `npm test` (frontend)
5. **Update documentation** if needed
6. **Submit a pull request** with clear description

### Code Style

- **Backend**: Black formatting, Flake8 linting, MyPy type checking
- **Frontend**: Prettier formatting, ESLint linting, TypeScript strict mode
- **Commit Messages**: Conventional commits format

## 📝 License

[Your License Here]

## 🆘 Support

- **Documentation**: Check individual README files in each directory
- **Issues**: Submit GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas

---

**Note**: This project is actively developed with a focus on AI-powered development tools and real-time user experiences.
