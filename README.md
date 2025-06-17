# AI Toolbox

一个全面的AI驱动开发工具包，提供实时流式响应、安全认证以及专门的Jira和GitHub工作流工具。

## 🚀 核心功能

- **实时流式响应**: 打字机效果的AI响应，提升用户体验
- **安全认证**: Microsoft OAuth 2.0自动令牌刷新
- **Jira集成**: AI驱动的任务评论生成，支持流式输出
- **GitHub集成**: 智能PR描述生成
- **浏览器扩展**: Chrome扩展，无缝集成工作流
- **模块化架构**: 前后端清晰分离

## 📁 项目结构

```
ai-toolbox/
├── backend/                 # FastAPI后端服务
│   ├── app/                # 应用代码
│   │   ├── api/           # API路由处理器
│   │   ├── services/      # 业务逻辑服务
│   │   └── utils/         # 工具函数
│   ├── tests/             # 后端测试
│   ├── pyproject.toml     # Python依赖管理
│   └── README.md         # 后端文档
├── frontend/              # Plasmo浏览器扩展
│   ├── src/              # 源代码
│   ├── background/       # 后台脚本
│   ├── package.json      # 前端依赖（pnpm）
│   └── README.md         # 前端文档
└── README.md             # 本文件
```

## 🛠 技术栈

### 后端
- **框架**: FastAPI + Uvicorn
- **AI服务**: Azure OpenAI + OAuth 2.0
- **认证**: Microsoft OAuth客户端凭据流
- **数据验证**: Pydantic v2
- **语言**: Python 3.11+
- **包管理**: uv

### 前端（浏览器扩展）
- **框架**: Plasmo + React + TypeScript
- **构建工具**: Plasmo Framework
- **样式**: Tailwind CSS + Mantine UI
- **包管理**: pnpm
- **扩展类型**: Manifest V3

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+ 和 pnpm
- Azure OpenAI访问权限和OAuth设置

### 后端设置

1. **进入后端目录**:
   ```bash
   cd backend
   ```

2. **安装依赖**:
   ```bash
   # 使用uv（推荐）
   uv sync

   # 或使用pip
   pip install -e .
   ```

3. **配置环境**:
   ```bash
   cp env.example .env
   # 编辑.env文件，配置Azure和OAuth信息
   ```

4. **运行后端**:
   ```bash
   uv run run_dev.py
   ```

### 浏览器扩展设置

1. **进入前端目录**:
   ```bash
   cd frontend
   ```

2. **安装依赖**:
   ```bash
   pnpm install
   ```

3. **开发模式**:
   ```bash
   pnpm dev
   ```

4. **构建扩展**:
   ```bash
   pnpm build
   # 在Chrome开发者模式下加载build文件夹
   ```

## 🔧 配置

### Azure OpenAI设置

1. **创建Azure OpenAI资源**
2. **注册Azure AD应用程序**
3. **配置环境变量**

详细配置步骤请参考 [backend/README.md](./backend/README.md)

## 🌟 主要功能

### 1. Jira任务评论生成
- 智能生成任务评论
- 支持实时流式输出
- 打字机效果提升用户体验

### 2. GitHub PR描述生成
- 自动生成PR描述
- 基于代码变更智能分析
- 支持流式响应

### 3. 通用文本生成
- 灵活的AI文本生成
- 可配置参数（温度、最大令牌数等）
- 适用于各种使用场景

## 🔄 开发工作流

### 后端开发
```bash
cd backend
uv sync                    # 安装依赖
uv run run_dev.py    # 启动开发服务器
```

### 扩展开发
```bash
cd frontend
pnpm install              # 安装依赖
pnpm dev                  # 开发模式
pnpm build                # 构建扩展
```

## 📊 API文档

后端运行后，访问API文档：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/api/v1/ai/health

### 主要端点
- `POST /api/v1/ai/jira/generate` - Jira评论生成（支持流式）
- `POST /api/v1/ai/github/pr-description` - GitHub PR描述
- `POST /api/v1/ai/generate` - 通用文本生成
- `GET /api/v1/ai/health` - 服务健康状态

## � 相关文档

- [后端文档](./backend/README.md) - 详细的后端API和配置说明
- [前端文档](./frontend/README.md) - 浏览器扩展开发指南

## 🤝 贡献

1. Fork本仓库
2. 创建功能分支: `git checkout -b feature/your-feature`
3. 提交更改并编写测试
4. 确保所有测试通过
5. 提交Pull Request

## 📝 许可证

[Your License Here]

---

**注意**: 本项目专注于AI驱动的开发工具和实时用户体验，正在积极开发中。
