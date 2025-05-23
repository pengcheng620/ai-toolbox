# AI Toolbox Backend

AI Toolbox 后端服务，为浏览器扩展提供安全的 AI 功能支持。

## 🚀 新功能特性

- 🔐 **OAuth Token 认证**: 支持 Azure OAuth 令牌认证，更安全的API访问
- 🤖 **LangChain 集成**: 使用 LangChain 实现智能对话和专业化AI代理
- 💬 **流式聊天**: 支持实时流式聊天响应，提升用户体验
- 🎯 **专业化场景**: 专门针对 Jira 和 GitHub 的内容生成优化
- ⚡ **高性能**: 基于 FastAPI 的异步 API 服务
- 🛡️ **类型安全**: 完整的 Pydantic 数据验证

## 认证方式

### 推荐：OAuth Token 认证 (更安全)

参考 `lib/ai/azure-auth.ts` 中的实现，使用 Azure OAuth client credentials flow：

```bash
# 在 .env 中配置
MS_OAUTH_CLIENT_ID=your-azure-app-client-id
MS_OAUTH_CLIENT_SECRET=your-azure-app-client-secret
MS_OAUTH_GRANT_TYPE=client_credentials
MS_OAUTH_SCOPE=https://cognitiveservices.azure.com/.default
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token
```

### 备选：API Key 认证

```bash
# 在 .env 中配置
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
```

## 技术栈

- **框架**: FastAPI + Uvicorn
- **AI服务**: Azure OpenAI + LangChain
- **认证**: OAuth 2.0 Client Credentials Flow
- **数据验证**: Pydantic v2
- **包管理**: uv
- **Python**: 3.11+

## 快速开始

### 环境要求

- Python 3.11 或更高版本
- uv 包管理器

### 安装依赖

```bash
# 安装项目依赖
uv sync

# 安装开发依赖
uv sync --dev
```

### 环境配置

1. 复制环境变量示例文件：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置 OAuth 认证信息：
```bash
# 推荐使用 OAuth 认证
MS_OAUTH_CLIENT_ID=your-azure-app-client-id
MS_OAUTH_CLIENT_SECRET=your-azure-app-client-secret
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token

# Azure OpenAI 端点
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# 应用密钥
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key
```

### 运行服务

```bash
# 开发环境运行
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 或使用开发脚本
uv run python run_dev.py
```

服务启动后，访问以下地址：

- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health
- **API 根路径**: http://localhost:8000/api/v1

## 🔄 API 接口

### AI 服务

- `POST /api/v1/ai/generate` - 通用文本生成 (LangChain增强)
- `POST /api/v1/ai/chat/stream` - 🆕 流式聊天对话
- `POST /api/v1/ai/jira/generate` - Jira 任务内容生成 (专业化提示)
- `POST /api/v1/ai/github/pr` - GitHub PR 描述生成 (专业化提示)
- `POST /api/v1/ai/auth/refresh` - 🆕 刷新认证令牌
- `GET /api/v1/ai/health` - AI 服务健康检查

### 认证服务

- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取用户信息
- `POST /api/v1/auth/logout` - 用户登出
- `GET /api/v1/auth/health` - 认证服务健康检查

### 🆕 流式聊天使用示例

```javascript
// 前端使用 Server-Sent Events 接收流式响应
const response = await fetch('/api/v1/ai/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '帮我分析这个Jira任务...' }
    ],
    temperature: 0.7
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  console.log('收到:', chunk);
}
```

## 开发指南

### 项目结构

```
backend/
├── app/                    # 应用主目录
│   ├── api/               # API 路由
│   │   ├── ai.py         # AI 服务路由 (OAuth + LangChain)
│   │   └── auth.py       # 认证路由
│   ├── models/           # 数据模型
│   │   └── schemas.py    # Pydantic 模型
│   ├── services/         # 业务逻辑
│   │   ├── azure_ai.py   # Azure AI 服务 (LangChain集成)
│   │   └── azure_oauth.py # 🆕 OAuth 令牌管理
│   ├── utils/            # 工具函数
│   │   └── logger.py     # 日志配置
│   ├── config.py         # 配置管理 (支持OAuth)
│   └── main.py          # FastAPI 应用入口
├── tests/                # 测试文件
├── .vscode/              # 🆕 VSCode 配置
├── pyproject.toml        # 项目配置
└── README.md            # 项目文档
```

### 代码质量

运行代码格式化：
```bash
uv run black app/
uv run isort app/
```

运行类型检查：
```bash
uv run mypy app/
```

运行测试：
```bash
uv run pytest
```

## 与前端集成

### 替换现有的 Azure 直接调用

原来的 `lib/ai/azure-auth.ts` 逻辑现在转移到了后端，前端可以直接调用后端API：

```typescript
// 替换前：直接调用 Azure OpenAI
const token = await getToken();
const response = await azureOpenAI.chat.completions.create({...});

// 替换后：调用后端API
const response = await fetch('http://localhost:8000/api/v1/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    prompt: generatePrompt(description),
    model: 'gpt-4o',
    max_tokens: 1000,
    system_message: '你是一个专业的开发助手...'
  })
});
```

### Jira 和 GitHub 专用端点

```typescript
// Jira 任务处理
const jiraResponse = await fetch('/api/v1/ai/jira/generate', {
  method: 'POST',
  body: JSON.stringify({
    task_description: '实现用户登录功能',
    task_type: 'development',
    context: { priority: 'high', assignee: 'developer' }
  })
});

// GitHub PR 描述
const prResponse = await fetch('/api/v1/ai/github/pr', {
  method: 'POST',
  body: JSON.stringify({
    pr_title: 'feat: 添加用户认证功能',
    code_changes: 'src/auth/* - 新增认证模块',
    branch_name: 'feature/user-auth',
    commit_messages: ['feat: add login endpoint', 'test: add auth tests']
  })
});
```

## 优势对比

### OAuth Token vs API Key

| 特性 | OAuth Token | API Key |
|------|-------------|---------|
| **安全性** | ✅ 自动过期，可撤销 | ⚠️ 长期有效 |
| **权限控制** | ✅ 细粒度权限 | ❌ 全权限 |
| **审计追踪** | ✅ 完整日志 | ⚠️ 有限 |
| **企业合规** | ✅ 企业级安全 | ❌ 不推荐 |

### LangChain 增强

- 🧠 **智能提示**: 针对不同场景的专业化提示模板
- 🔧 **工具链**: 支持扩展更多AI工具和代理
- 📊 **结构化输出**: 更好的数据解析和处理
- 🔄 **工作流**: 支持复杂的AI工作流编排

## 部署

### Docker 部署

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install uv
RUN uv pip install -r pyproject.toml

COPY app/ ./app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 环境变量

生产环境需要配置的关键环境变量：

- `MS_OAUTH_CLIENT_ID`: Azure 应用客户端ID
- `MS_OAUTH_CLIENT_SECRET`: Azure 应用客户端密钥  
- `MS_OAUTH_URL`: OAuth token 端点
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 服务端点
- `SECRET_KEY`: 应用密钥
- `JWT_SECRET_KEY`: JWT 签名密钥
- `ENVIRONMENT`: 环境标识 (production)

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系开发团队。 