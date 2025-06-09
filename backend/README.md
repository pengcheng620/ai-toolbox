# AI Toolbox Backend

A FastAPI-based backend service for AI-powered development tools with Azure OpenAI integration, featuring real-time streaming responses and secure OAuth authentication.

## Features

- **Azure OpenAI Integration**: Seamless integration with Azure OpenAI services using OAuth 2.0
- **Real-time Streaming**: Server-Sent Events (SSE) for typewriter-effect responses
- **OAuth Authentication**: Secure Microsoft OAuth 2.0 authentication with automatic token refresh
- **Modular Architecture**: Clean separation of concerns with dedicated services
- **CORS Support**: Configured for browser extension and web application access
- **Health Monitoring**: Built-in health check and diagnostic endpoints
- **Error Handling**: Comprehensive error handling with automatic retry logic

## API Endpoints

### Health Check
- `GET /api/v1/ai/health` - Service health status with authentication info

### Text Generation
- `POST /api/v1/ai/generate` - Generate text with Azure OpenAI (supports streaming)

### Jira Integration
- `POST /api/v1/ai/jira/generate` - **Enhanced** Generate Jira Definition of Done (DoD) summary with streaming support
- `POST /api/v1/ai/jira/definition-of-done` - Generate Definition of Done summary for development tickets

### GitHub Integration
- `POST /api/v1/ai/github/pr-description` - Generate PR descriptions (supports streaming)

## Streaming Support

All AI endpoints support real-time streaming responses for enhanced user experience:

### Request Format
```json
{
  "task_description": "Implement user authentication",
  "task_type": "feature",
  "context": {
    "priority": "high",
    "estimated_hours": 8
  },
  "stream": true
}
```

### Response Format
When `stream: true`, responses use Server-Sent Events (SSE):
- Content chunks: `data: <content>\n\n`
- Completion marker: `data: [DONE]\n\n`
- Error format: `data: Error: <message>\n\n`

### Example Usage
```javascript
// Frontend JavaScript example
const response = await fetch('/api/v1/ai/jira/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task_description: "Add user login functionality",
    stream: true
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  // Process streaming data for typewriter effect
  console.log(chunk);
}
```

## Environment Configuration

Create a `.env` file in the backend directory:

```env
# Application Settings
APP_NAME=AI Toolbox Backend
APP_VERSION=0.1.0
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-here-at-least-32-characters

# API Configuration
API_V1_PREFIX=/api/v1
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=chrome-extension://*,http://localhost:3000,https://jira.autodesk.com,http://github.com,https://git.autodesk.com

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-05-15
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Microsoft OAuth Configuration (Required)
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant.onmicrosoft.com/oauth2/v2.0/token
MS_OAUTH_CLIENT_ID=your-client-id
MS_OAUTH_CLIENT_SECRET=your-client-secret
MS_OAUTH_GRANT_TYPE=client_credentials
MS_OAUTH_SCOPE=https://cognitiveservices.azure.com/.default

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here-at-least-32-characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

### Removed Environment Variables
The following variables have been removed in the latest version:
- `OPENAI_API_KEY` (replaced by OAuth)
- `DATABASE_URL` (not currently used)
- `REDIS_URL` (not currently used)
- `ENABLE_CACHING`, `ENABLE_RATE_LIMITING`, `ENABLE_METRICS` (feature flags removed)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ai-toolbox/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   # Using uv (recommended)
   uv sync

   # Or using pip
   pip install -e .
   ```

4. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Azure and OAuth configuration
   ```

5. **Run the application**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## OAuth Authentication Setup

### 1. Azure AD Application Registration

1. **Register Application**:
   - Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
   - Click "New registration"
   - Name: "AI Toolbox Backend"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Not required for client credentials flow

2. **Create Client Secret**:
   - Go to "Certificates & secrets" > "Client secrets"
   - Click "New client secret"
   - Description: "AI Toolbox Backend Secret"
   - Expires: Choose appropriate duration
   - **Copy the secret value immediately** (it won't be shown again)

3. **Configure API Permissions**:
   - Go to "API permissions"
   - Click "Add a permission"
   - Select "APIs my organization uses"
   - Search for "Azure Cognitive Services" or use scope: `https://cognitiveservices.azure.com/.default`
   - Select "Application permissions"
   - Click "Grant admin consent"

### 2. Environment Configuration

Update your `.env` file with the OAuth credentials:

```env
MS_OAUTH_CLIENT_ID=<Application-ID-from-step-1>
MS_OAUTH_CLIENT_SECRET=<Secret-value-from-step-2>
MS_OAUTH_URL=https://login.microsoftonline.com/<your-tenant-id>/oauth2/v2.0/token
```

### 3. Verify OAuth Setup

Test OAuth authentication:
```bash
curl -X GET "http://localhost:8000/api/v1/ai/health"
```

Expected response:
```json
{
  "status": "healthy",
  "service": "azure_ai", 
  "auth_method": "oauth",
  "endpoint": "https://your-resource.openai.azure.com/"
}
```

## Development

### Project Structure

```
backend/
├── app/
│   ├── api/              # API route handlers
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── base.py       # Base AI endpoints
│   │   ├── chat.py       # Chat endpoints
│   │   ├── jira.py       # Jira integration (with streaming)
│   │   └── github.py     # GitHub integration
│   ├── services/         # Business logic services
│   │   ├── azure_ai.py   # Azure OpenAI service (streaming support)
│   │   ├── azure_oauth.py # OAuth authentication service
│   │   ├── base_ai.py    # Base AI service with retry logic
│   │   └── jira_service.py # Jira Definition of Done (DoD) AI services
│   ├── utils/            # Utility functions
│   │   └── logger.py     # Logging configuration
│   ├── config.py         # Configuration management
│   └── main.py           # FastAPI application
├── tests/                # Test files
├── pyproject.toml        # Python dependencies (uv)
├── uv.lock              # Lock file
├── env.example          # Environment template
└── README.md            # This file
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_api.py

# Test streaming functionality
pytest tests/test_streaming.py -v
```

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Troubleshooting

### Common Issues

#### 1. Connection Error
```
Error: Connection error.
```
**Solutions**:
- Verify Azure OpenAI endpoint URL format: `https://your-resource.openai.azure.com/`
- Check OAuth credentials (client ID and secret)
- Ensure network connectivity to Azure services
- Verify deployment name matches your Azure OpenAI model deployment

#### 2. Authentication Failed
```
Error: Missing credentials. Please pass one of `api_key`, `azure_ad_token`...
```
**Solutions**:
- Verify OAuth configuration in `.env`
- Check client ID and secret are correct
- Ensure API permissions are granted in Azure AD
- Verify tenant ID in OAuth URL

#### 3. OAuth Token Issues
```
Error: 401 Unauthorized
```
**Solutions**:
- Service automatically refreshes tokens, but check:
- OAuth endpoint accessibility
- Correct tenant ID in `MS_OAUTH_URL`
- Client secret hasn't expired
- API permissions are properly configured

#### 4. CORS Issues
```
Error: CORS policy blocked the request
```
**Solutions**:
- Update `CORS_ORIGINS` in `.env` to include your frontend domain
- Add specific origins: `http://localhost:3000,https://yourdomain.com`
- Restart the server after CORS changes
- For browser extensions, ensure `chrome-extension://*` is included

#### 5. Streaming Not Working
```
Streaming response appears as single chunk
```
**Solutions**:
- Ensure `stream: true` in request body
- Check frontend properly handles SSE format
- Verify `Content-Type: text/plain` in streaming response
- Test with curl: `curl -N` flag for no buffering

### Debug Mode

Enable comprehensive logging:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

View detailed logs:
```bash
tail -f logs/app.log  # If file logging is configured
# Or check console output
```

### Health Check Diagnostics

Monitor service health and authentication:
```bash
curl -v http://localhost:8000/api/v1/ai/health
```

Expected healthy response:
```json
{
  "status": "healthy",
  "service": "azure_ai",
  "auth_method": "oauth",
  "endpoint": "https://your-resource.openai.azure.com/"
}
```

### Testing Streaming Endpoints

Test streaming functionality:
```bash
# Test Jira streaming
curl -X POST "http://localhost:8000/api/v1/ai/jira/generate" \
  -H "Content-Type: application/json" \
  -d '{"task_description": "Test task", "stream": true}' \
  --no-buffer
```

## Performance Considerations

- **Token Caching**: OAuth tokens are cached and automatically refreshed
- **Connection Pooling**: HTTP connections are pooled for efficiency
- **Streaming Optimization**: Use streaming for long responses to improve perceived performance
- **Error Handling**: Automatic retry logic for transient Azure OpenAI failures
- **Memory Management**: Streaming responses don't load entire content into memory

## Security Best Practices

- **Environment Variables**: Never commit `.env` files to version control
- **OAuth Tokens**: Tokens are automatically refreshed and secured in memory
- **CORS Configuration**: Restrict to specific domains in production
- **Secrets Management**: Use strong, unique secrets for JWT and application keys
- **HTTPS**: Always use HTTPS in production environments
- **Token Expiration**: Configure appropriate token expiration times

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with proper tests
4. Ensure all tests pass: `pytest`
5. Update documentation if needed
6. Submit a pull request with clear description

## License

[Your License Here]
