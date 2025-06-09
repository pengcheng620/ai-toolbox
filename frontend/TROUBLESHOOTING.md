# 🔧 故障排除指南

## ✅ 已解决: Jira API 调用CORS错误

### 问题描述
- **错误信息**: `Failed to fetch`
- **后端日志**: `OPTIONS /api/v1/ai/jira/comment HTTP/1.1" 400 Bad Request`
- **原因**: 内容脚本受到浏览器同源策略限制，直接fetch调用外部API会产生CORS错误

### 🎯 最终解决方案 - Plasmo Messaging API

根据Plasmo官方文档建议，我们采用了**Messaging API + Background Service Worker**的架构来彻底解决CORS问题。

#### 📋 新架构流程

```
内容脚本 → Plasmo Messaging API → 后台脚本 → 后端API → 响应返回
```

#### 🔧 实现细节

**1. 后台脚本** (`src/background.ts`):
```typescript
import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  switch (req.name) {
    case "jira-comment":
      try {
        const result = await callApi("/ai/jira/comment", {
          method: "POST", 
          body: JSON.stringify(req.body),
        })
        res.send({ success: true, data: result })
      } catch (error) {
        res.send({ success: false, error: error.message })
      }
      break
  }
}
```

**2. Messaging Hooks** (`src/hook/use-api-messaging.tsx`):
```typescript
import { sendToBackground } from "@plasmohq/messaging"

export function useJiraCommentMessaging() {
  return useMessagingApi("jira-comment")
}
```

**3. 组件使用**:
```typescript
import { useJiraCommentMessaging } from "~hook/use-api-messaging"

const { execute, loading, error } = useJiraCommentMessaging()
const result = await execute({ task_description: "..." })
```

#### 🔄 迁移过程

1. **安装依赖**:
   ```bash
   pnpm add @plasmohq/messaging
   ```

2. **创建后台脚本**: 处理所有API调用
3. **创建Messaging Hooks**: 封装消息传递逻辑
4. **更新组件**: 使用新的hooks替代直接fetch

#### ✅ 优势

- **🚫 无CORS限制**: 后台脚本不受同源策略限制
- **🔒 更安全**: API调用在扩展环境中进行
- **📊 更好的错误处理**: 统一的错误处理和日志记录
- **🎯 符合最佳实践**: 遵循Plasmo官方推荐架构

### 🧪 测试验证

**控制台验证**:
```javascript
// 查看后台脚本日志
// 🚀 Background: API调用 /ai/jira/comment
// 📡 Background: 响应状态 200
// ✅ Background: API响应 {...}
```

### 📝 为什么这种方案有效

1. **同源策略豁免**: Chrome扩展的后台脚本享有特殊权限，可以向任何域发起请求
2. **安全隔离**: 敏感的API调用逻辑与页面内容脚本分离
3. **Plasmo优化**: 框架提供了优雅的消息传递机制，简化了开发

### 🔧 配置要求

**package.json manifest 权限**:
```json
{
  "manifest": {
    "host_permissions": [
      "https://*/*",
      "http://localhost:8000/*"
    ]
  }
}
```

### 📊 性能对比

| 方案 | CORS问题 | 开发复杂度 | 性能 | 安全性 |
|------|----------|------------|------|--------|
| 直接fetch | ❌ 有问题 | 🟢 简单 | 🟢 高 | 🟡 一般 |
| Messaging API | ✅ 无问题 | 🟡 中等 | 🟡 中等 | 🟢 高 |

### 🚀 后续优化

- [ ] 添加请求缓存机制
- [ ] 实现自动重试逻辑
- [ ] 添加请求队列管理
- [ ] 集成更多后端API端点

---

## 📝 其他已知问题

### Q1: 如何调试Messaging API？
**答**: 
1. 打开Chrome扩展管理页面
2. 点击"检查视图：背景页"
3. 查看后台脚本的Console日志

### Q2: 消息传递失败怎么办？
**答**: 检查：
1. 后台脚本是否正确注册handler
2. 消息名称是否匹配
3. 扩展是否已重新加载

### Q3: 如何添加新的API端点？
**答**: 
1. 在background.ts中添加新的case
2. 创建对应的hook函数
3. 在组件中使用新hook

### 🎉 成功验证

现在你可以：
- ✅ 正常使用Jira评论生成功能
- ✅ 正常使用GitHub PR生成功能  
- ✅ 在扩展中查看详细的调试日志
- ✅ 享受无CORS限制的开发体验 