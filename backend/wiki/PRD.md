
# AI Toolbox 后端技术选型与实施方案

## 🎯 技术选型分析

### Node.js vs Python[uv] 对比

| 维度 | Node.js | Python[uv] | 推荐 |
|------|---------|------------|------|
| **语言一致性** | ✅ 与前端 TypeScript 一致 | ❌ 需要维护两种语言 | Node.js |
| **AI 生态系统** | ⚡ 基础支持，发展中 | ✅ 最丰富的 AI/ML 生态 | **Python** |
| **LangChain 支持** | ⚡ 有 JS 版本，功能有限 | ✅ 原生支持，功能完整 | **Python** |
| **开发效率** | ✅ 快速开发，npm 生态 | ✅ uv 包管理极快 | 平手 |
| **类型安全** | ✅ TypeScript 原生支持 | ⚡ 通过 Pydantic 实现 | Node.js |
| **部署运维** | ✅ 容器化简单 | ✅ 容器化简单 | 平手 |
| **Agent 开发** | ❌ 工具链有限 | ✅ 丰富的 Agent 框架 | **Python** |
| **Azure 集成** | ✅ 官方 SDK 支持良好 | ✅ 官方 SDK 支持良好 | 平手 |

### 💡 最终推荐：**Python + uv**

**理由：**
1. **AI 优先**：考虑到项目的核心是 AI 功能，Python 的 AI 生态系统无可替代
2. **LangChain 完整支持**：未来的 Agent 开发需求
3. **扩展性**：支持更多 AI 模型和工具集成
4. **成熟度**：在 AI 应用开发方面更成熟

## 🏗️ 推荐技术栈

### 核心框架
```python
# 核心依赖
fastapi = "^0.104.0"          # 现代 API 框架
uvicorn = "^0.24.0"           # ASGI 服务器
pydantic = "^2.4.0"           # 数据验证
python-jose = "^3.3.0"        # JWT 处理
```

### AI 相关
```python
# AI 核心
langchain = "^0.1.0"          # AI 应用框架
langchain-openai = "^0.0.2"   # OpenAI 集成
azure-identity = "^1.15.0"    # Azure 认证
openai = "^1.3.0"             # OpenAI 客户端
```

### 数据存储
```python
# 数据库
sqlalchemy = "^2.0.0"         # ORM
asyncpg = "^0.29.0"           # PostgreSQL 驱动
redis = "^5.0.0"              # 缓存
```

## 🚀 优先级实施计划

### Phase 1: 核心基础 (立即实施 - 1-2周)

#### 1.1 Azure API 认证代理 🔴 **最高优先级**
```python
# app/services/azure_auth.py
from azure.identity import DefaultAzureCredential
from openai import AzureOpenAI

class AzureAIService:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_ENDPOINT,
            api_key=settings.AZURE_API_KEY,
            api_version="2023-05-15"
        )
    
    async def generate_text(self, prompt: str, model: str = "gpt-4o"):
        """安全的 AI 文本生成"""
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        return response.choices[0].message.content
```

#### 1.2 基础 API 结构
```python
# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Toolbox Backend")

# CORS 配置支持浏览器扩展
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 核心路由
app.include_router(ai_router, prefix="/api/ai")
app.include_router(auth_router, prefix="/api/auth")
```

#### 1.3 立即可交付的功能
- ✅ Jira 评论生成（通过后端）
- ✅ GitHub PR 描述生成（通过后端）
- ✅ 用户认证和权限控制
- ✅ API 密钥安全保护

### Phase 2: 智能化增强 (2-4周)

#### 2.1 LangChain Agent 集成
```python
# app/agents/jira_agent.py
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.tools import Tool

class JiraAgent:
    def __init__(self):
        self.tools = [
            Tool(
                name="jira_analyzer",
                description="分析 Jira 任务描述",
                func=self._analyze_jira_task
            ),
            Tool(
                name="test_generator",
                description="生成测试验证内容",
                func=self._generate_test_content
            )
        ]
        
    async def process_jira_task(self, task_description: str):
        """智能处理 Jira 任务"""
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.jira_prompt
        )
        
        executor = AgentExecutor(agent=agent, tools=self.tools)
        return await executor.ainvoke({
            "input": task_description,
            "task_type": "jira_comment_generation"
        })
```

#### 2.2 网站特定的 Agent Tools
```python
# app/agents/website_agents.py
class WebsiteAgentFactory:
    @staticmethod
    def create_agent(website_type: str):
        if website_type == "jira":
            return JiraAgent()
        elif website_type == "github":
            return GitHubAgent()
        elif website_type == "confluence":
            return ConfluenceAgent()
        # 支持扩展更多网站
```

### Phase 3: 高级功能 (4-8周)

#### 3.1 多模型支持和路由
```python
# app/services/model_router.py
class ModelRouter:
    def __init__(self):
        self.models = {
            "text_generation": ["gpt-4o", "claude-3", "gemini-pro"],
            "code_review": ["gpt-4o", "codellama"],
            "translation": ["gpt-4o", "claude-3"]
        }
    
    def route_request(self, task_type: str, complexity: str):
        """根据任务类型和复杂度选择最适合的模型"""
        pass
```

#### 3.2 智能缓存和优化
```python
# app/services/cache_service.py
import hashlib
from redis import Redis

class SmartCache:
    def __init__(self):
        self.redis = Redis.from_url(settings.REDIS_URL)
    
    async def get_or_generate(self, prompt: str, model: str):
        """智能缓存，避免重复的 AI 调用"""
        cache_key = hashlib.md5(f"{prompt}:{model}".encode()).hexdigest()
        
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # 生成新内容并缓存
        result = await self.ai_service.generate(prompt, model)
        await self.redis.setex(cache_key, 3600, json.dumps(result))
        return result
```

## 📁 推荐项目结构

```
ai-toolbox-backend/
├── pyproject.toml              # uv 项目配置
├── .python-version             # Python 版本
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── config.py               # 配置管理
│   ├── api/                    # API 路由
│   │   ├── auth.py            # 认证相关
│   │   ├── ai.py              # AI 服务 API
│   │   └── analytics.py       # 分析统计
│   ├── agents/                 # LangChain Agents
│   │   ├── base_agent.py      # 基础 Agent 类
│   │   ├── jira_agent.py      # Jira 专用 Agent
│   │   ├── github_agent.py    # GitHub 专用 Agent
│   │   └── website_factory.py # Agent 工厂
│   ├── services/              # 业务逻辑层
│   │   ├── azure_ai.py        # Azure AI 服务
│   │   ├── auth_service.py    # 认证服务
│   │   ├── cache_service.py   # 缓存服务
│   │   └── model_router.py    # 模型路由
│   ├── models/                # 数据模型
│   │   ├── user.py           # 用户模型
│   │   └── usage.py          # 使用统计模型
│   └── utils/                 # 工具函数
│       ├── logger.py         # 日志配置
│       └── security.py       # 安全工具
├── tests/                     # 测试文件
├── docker-compose.yml         # 开发环境
├── Dockerfile                 # 生产环境
└── README.md                  # 文档
```

## ⚡ 立即可实施的第一步

### 1. 项目初始化
```bash
# 创建项目
mkdir ai-toolbox-backend && cd ai-toolbox-backend

# 使用 uv 初始化项目
uv init --python 3.11
uv add fastapi uvicorn[standard] pydantic python-jose[cryptography]
uv add langchain langchain-openai azure-identity openai
uv add sqlalchemy asyncpg redis python-multipart
```

### 2. 最小可行产品 (MVP) - 1天完成
```python
# app/main.py - 最简单的工作版本
from fastapi import FastAPI
from openai import AzureOpenAI

app = FastAPI()
client = AzureOpenAI(
    azure_endpoint="your-endpoint",
    api_key="your-key",  # 从环境变量读取
    api_version="2023-05-15"
)

@app.post("/api/ai/generate")
async def generate_text(request: dict):
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": request["prompt"]}]
    )
    return {"text": response.choices[0].message.content}

# 启动: uv run uvicorn app.main:app --reload
```

### 3. 前端立即更新
```typescript
// 立即替换现有的 Azure 直接调用
const response = await fetch('http://localhost:8000/api/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: generatePrompt(description) })
});
```

## 🎯 预期收益

### 立即收益 (Phase 1)
- ✅ API 密钥安全保护
- ✅ 统一的 AI 调用管理
- ✅ 基础的用户认证

### 中期收益 (Phase 2)
- 🤖 智能 Agent 支持每个网站的特定需求
- 📊 使用统计和成本控制
- ⚡ 请求缓存和性能优化

### 长期收益 (Phase 3)
- 🚀 多模型智能路由
- 🔧 自定义 Agent Tools
- 📈 高级分析和优化

这个方案既保证了立即可实施性，又为未来的 AI 功能扩展奠定了坚实基础！
