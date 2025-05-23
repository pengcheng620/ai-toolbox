# AI Toolbox Backend 模块化迁移指南

## 概述

本次重构将原本单一的 `AzureAIService` 和 API 层按功能模块进行了拆分，提供更清晰的代码结构和更好的可维护性。

## 🔄 结构变更

### Service 层变更

**原结构:**
```
app/services/
├── azure_ai.py (包含所有AI功能)
└── azure_oauth.py
```

**新结构:**
```
app/services/
├── base_ai.py          # 基础AI服务和客户端管理
├── chat_service.py     # 聊天对话功能
├── jira_service.py     # Jira任务管理功能
├── github_service.py   # GitHub PR和代码审查功能
└── azure_oauth.py      # OAuth认证服务
```

### API 层变更

**原结构:**
```
app/api/
├── ai.py (包含所有AI端点)
└── auth.py
```

**新结构:**
```
app/api/
├── base.py     # 基础AI端点 (/ai/*)
├── chat.py     # 聊天端点 (/ai/chat/*)
├── jira.py     # Jira端点 (/ai/jira/*)
├── github.py   # GitHub端点 (/ai/github/*)
└── auth.py     # 认证端点
```

## 📋 API 端点映射

### 原端点 → 新端点

| 原端点 | 新端点 | 功能 |
|--------|--------|------|
| `POST /api/v1/ai/generate` | `POST /api/v1/ai/generate` | 通用文本生成 |
| `POST /api/v1/ai/chat/stream` | `POST /api/v1/ai/chat/stream` | 流式聊天 |
| `POST /api/v1/ai/jira/generate` | `POST /api/v1/ai/jira/comment` | Jira评论生成 |
| `POST /api/v1/ai/github/pr` | `POST /api/v1/ai/github/pr` | GitHub PR描述 |
| `POST /api/v1/ai/auth/refresh` | `POST /api/v1/ai/auth/refresh` | 认证刷新 |
| `GET /api/v1/ai/health` | `GET /api/v1/ai/health` | 健康检查 |

### 新增端点

| 端点 | 功能 | 描述 |
|------|------|------|
| `POST /api/v1/ai/chat/simple` | 简单聊天 | 非流式聊天响应 |
| `POST /api/v1/ai/jira/acceptance-criteria` | 验收条件 | 生成Jira验收条件 |
| `POST /api/v1/ai/jira/estimate` | 工作量估算 | 估算任务工作量 |
| `POST /api/v1/ai/github/commit` | 提交消息 | 生成标准提交消息 |
| `POST /api/v1/ai/github/review` | 代码审查 | AI代码审查建议 |
| `POST /api/v1/ai/github/release-notes` | 发布说明 | 生成版本发布说明 |

## 🚀 前端代码迁移

### 1. 基础文本生成（无变更）

```javascript
// 继续使用原有端点
const response = await fetch('/api/v1/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    model: 'gpt-4o',
    max_tokens: 1000
  })
});
```

### 2. 聊天功能增强

```javascript
// 原有流式聊天（无变更）
const response = await fetch('/api/v1/ai/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  })
});

// 新增：简单聊天（非流式）
const simpleChat = await fetch('/api/v1/ai/chat/simple', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Hello, how are you?',
    system_message: '你是一个友好的助手'
  })
});
```

### 3. Jira功能增强

```javascript
// 原有Jira评论生成（端点路径变更）
const jiraComment = await fetch('/api/v1/ai/jira/comment', {
  method: 'POST',
  body: JSON.stringify({
    task_description: '实现用户登录功能',
    task_type: 'development'
  })
});

// 新增：验收条件生成
const acceptanceCriteria = await fetch('/api/v1/ai/jira/acceptance-criteria', {
  method: 'POST',
  body: JSON.stringify({
    task_description: '用户登录功能',
    user_story: 'As a user, I want to login...'
  })
});

// 新增：工作量估算
const effort = await fetch('/api/v1/ai/jira/estimate', {
  method: 'POST',
  body: JSON.stringify({
    task_description: '实现用户登录',
    task_type: 'development',
    team_velocity: 20
  })
});
```

### 4. GitHub功能增强

```javascript
// 原有PR描述生成（无变更）
const prDescription = await fetch('/api/v1/ai/github/pr', {
  method: 'POST',
  body: JSON.stringify({
    pr_title: 'feat: 添加用户认证',
    code_changes: 'Added authentication module'
  })
});

// 新增：提交消息生成
const commitMsg = await fetch('/api/v1/ai/github/commit', {
  method: 'POST',
  body: JSON.stringify({
    code_changes: 'Added login form validation',
    change_type: 'feat',
    scope: 'auth'
  })
});

// 新增：代码审查
const codeReview = await fetch('/api/v1/ai/github/review', {
  method: 'POST',
  body: JSON.stringify({
    code_diff: '+function validateEmail(email) {\n+  return /\\S+@\\S+\\.\\S+/.test(email);\n+}',
    review_focus: 'security',
    programming_language: 'javascript'
  })
});
```

## 🔧 服务层使用

### 导入新服务

```python
# 新的导入方式
from app.services.base_ai import base_ai_service
from app.services.chat_service import chat_service
from app.services.jira_service import jira_service
from app.services.github_service import github_service

# 或者从模块根部导入
from app.services import (
    base_ai_service,
    chat_service, 
    jira_service,
    github_service
)
```

### 服务实例使用

```python
# 基础AI功能
result = await base_ai_service.generate_text(
    prompt="Your prompt",
    model="gpt-4o"
)

# 聊天功能
async for chunk in chat_service.generate_chat_stream(messages):
    print(chunk)

# Jira功能
jira_result = await jira_service.generate_task_comment(
    task_description="Implement login",
    task_type="development"
)

# GitHub功能
pr_result = await github_service.generate_pr_description(
    pr_title="feat: add auth",
    code_changes="Added authentication module"
)
```

## 🆙 优势

### 1. 更好的代码组织

- **单一职责**: 每个服务只负责特定功能领域
- **清晰边界**: 模块间职责分离明确
- **易于扩展**: 添加新功能不影响现有模块

### 2. 改进的开发体验

- **模块化测试**: 可以独立测试每个功能模块
- **并行开发**: 团队可以同时开发不同模块
- **代码复用**: 基础服务可被多个特化服务继承

### 3. 增强的API设计

- **语义化路径**: API路径更直观地反映功能
- **专门化响应**: 每个端点返回最适合的数据结构
- **版本兼容**: 保持向后兼容，同时提供新功能

## 🚧 注意事项

1. **导入路径**: 确保更新所有导入语句
2. **端点变更**: 更新前端代码中的API端点路径
3. **响应格式**: 某些响应格式可能有细微变化
4. **新功能**: 利用新增的专门化端点提升用户体验

## 🔄 逐步迁移建议

1. **阶段1**: 更新后端服务导入，确保现有功能正常
2. **阶段2**: 逐个更新前端API调用端点
3. **阶段3**: 集成和测试新功能端点
4. **阶段4**: 优化和性能调整

## 📞 支持

如果在迁移过程中遇到问题，请：
1. 查看API文档：`http://localhost:8000/docs`
2. 检查日志输出
3. 提交Issue或联系开发团队 