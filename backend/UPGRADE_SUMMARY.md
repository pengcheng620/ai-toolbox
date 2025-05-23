# 🚀 AI Toolbox Backend 重大升级

## 📋 升级概览

根据您的需求，我们已成功将后端服务升级以支持：

1. **🔐 OAuth Token 认证** - 参考 `lib/ai/azure-auth.ts` 的实现
2. **🤖 LangChain 对话流处理** - 更智能的AI功能
3. **💬 流式聊天响应** - 实时对话体验

## 🔧 主要改动

### 1. OAuth 认证系统 (azure_oauth.py)

```python
# 自动token管理，与前端azure-auth.ts逻辑一致
async def get_token(self) -> str:
    """获取有效的OAuth token（缓存或重新获取）"""
    if self._cached_token and current_time < self._token_expiry_time:
        return self._cached_token  # 使用缓存
    
    # 获取新token，1小时有效期
    self._cached_token = await self._fetch_oauth_token()
    return self._cached_token
```

### 2. LangChain 集成 (azure_ai.py)

```python
# 支持系统消息和结构化对话
messages = [
    SystemMessage(content="你是专业的开发助手..."),
    HumanMessage(content=user_prompt)
]

client = await self._get_langchain_client()
response = await client.ainvoke(messages)
```

### 3. 流式聊天 API

```javascript
// 前端使用 Server-Sent Events
const response = await fetch('/api/v1/ai/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: '...' }]
  })
});

// 实时接收响应
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

## 🔄 与现有代码的集成

### 替换直接Azure调用

您现有的 `lib/ai/azure-auth.ts` 中的OAuth逻辑现在在后端处理：

```typescript
// 原来：前端直接调用
const token = await getToken();
const azureClient = new AzureOpenAI({
  azure_ad_token: token,
  // ...
});

// 现在：调用后端API
const response = await fetch('/api/v1/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    system_message: '你是专业助手...'
  })
});
```

### 专业化端点

```typescript
// Jira任务处理
await fetch('/api/v1/ai/jira/generate', {
  method: 'POST',
  body: JSON.stringify({
    task_description: 'Implement user login',
    task_type: 'development',
    context: { priority: 'high' }
  })
});

// GitHub PR描述
await fetch('/api/v1/ai/github/pr', {
  method: 'POST', 
  body: JSON.stringify({
    pr_title: 'feat: Add OAuth authentication',
    code_changes: 'Added OAuth service and LangChain integration',
    branch_name: 'feature/oauth-auth'
  })
});
```

## 🌟 新功能优势

### OAuth vs API Key

| 特性 | OAuth Token | API Key |
|------|-------------|---------|
| **安全性** | ✅ 自动过期 | ❌ 永久有效 |
| **权限控制** | ✅ 细粒度 | ❌ 全权限 |
| **企业合规** | ✅ 符合标准 | ⚠️ 有风险 |
| **审计追踪** | ✅ 完整日志 | ⚠️ 有限 |

### LangChain增强

- 🧠 **专业化提示**: 针对Jira/GitHub的优化prompts
- 🔧 **模块化架构**: 易于扩展新的AI工具
- 📊 **结构化输出**: 更好的数据处理
- 🔄 **工作流支持**: 复杂AI任务编排

## 📋 环境配置

在 `.env` 文件中配置（与azure-auth.ts保持一致）：

```bash
# OAuth认证 (推荐)
MS_OAUTH_CLIENT_ID=your-client-id
MS_OAUTH_CLIENT_SECRET=your-client-secret  
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant/oauth2/v2.0/token

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# 应用密钥
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

## 🚀 立即可用

1. **依赖已安装**: `uv sync` ✅
2. **测试通过**: 5/5 tests passing ✅  
3. **代码格式化**: Black formatting applied ✅
4. **API文档**: http://localhost:8000/docs ✅

## 📞 技术支持

- 健康检查: `GET /api/v1/ai/health`
- 认证刷新: `POST /api/v1/ai/auth/refresh`  
- 流式聊天: `POST /api/v1/ai/chat/stream`

项目已准备好与前端浏览器扩展集成，提供更安全、更智能的AI服务！ 