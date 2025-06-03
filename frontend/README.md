# AI Toolbox Browser Extension

基于Plasmo框架的浏览器扩展，为AI工具箱提供无缝的浏览器集成体验，支持实时流式响应和现代UI组件。

## 🚀 功能特性

- **实时流式UI**: 处理服务器发送事件的打字机效果组件
- **Jira集成界面**: 浏览器内Jira评论生成界面
- **GitHub集成界面**: PR描述生成界面
- **通用AI聊天**: 通用AI聊天界面
- **无缝集成**: 直接在目标网站上注入UI组件
- **响应式设计**: 适配各种屏幕尺寸的界面

## 🛠 技术栈

- **框架**: Plasmo + React 18 + TypeScript
- **构建工具**: Plasmo Framework
- **样式**: Tailwind CSS + Mantine UI组件库
- **状态管理**: Plasmo Storage API
- **HTTP客户端**: Fetch API，支持流式响应
- **图标**: Heroicons
- **包管理**: pnpm
- **扩展类型**: Manifest V3

## 📁 项目结构

```
frontend/
├── src/                    # 源代码目录
│   ├── components/         # 可复用UI组件
│   ├── hooks/             # 自定义React hooks
│   ├── services/          # API和外部服务
│   ├── types/             # TypeScript类型定义
│   └── utils/             # 工具函数
├── background/            # 后台脚本
├── assets/               # 静态资源
├── lib/                  # 库文件
├── terminal/             # 终端相关组件
├── package.json          # 依赖和脚本（pnpm）
├── plasmo.config.js      # Plasmo配置
├── tailwind.config.js    # Tailwind CSS配置
├── tsconfig.json         # TypeScript配置
└── README.md             # 本文件
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm
- Chrome浏览器（用于开发和测试）

### 安装和开发

```bash
# 安装依赖
pnpm install

# 启动开发模式（监听文件变化）
pnpm dev

# 构建生产版本
pnpm build

# 打包扩展
pnpm package
```

### 加载扩展到Chrome

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `build/chrome-mv3-dev` 文件夹（开发模式）或 `build/chrome-mv3-prod` 文件夹（生产模式）

## 🔗 后端集成

扩展通过 `http://localhost:8000` 与后端API集成：

### Plasmo消息传递

```typescript
// 使用Plasmo的消息传递API与后台脚本通信
import { sendToBackground } from "@plasmohq/messaging"

// 发送消息到后台脚本
const response = await sendToBackground({
  name: "generateJiraComment",
  body: {
    task_description: "实现用户认证",
    task_type: "feature",
    stream: true
  }
})
```

### 流式响应处理

```typescript
// hooks/useStreaming.ts
import { useState, useCallback } from 'react';

export const useStreaming = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');

  const startStream = useCallback(async (data: any) => {
    setIsStreaming(true);
    setContent('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/jira/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stream: true })
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        setContent(prev => prev + chunk);
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { startStream, isStreaming, content };
};
```

### Content Script示例

```typescript
// contents/jira-integration.tsx
import type { PlasmoCSConfig } from "plasmo"
import { useState } from "react"
import { useStreaming } from "~hooks/useStreaming"

export const config: PlasmoCSConfig = {
  matches: ["https://jira.*.com/*"]
}

const JiraCommentGenerator = () => {
  const { startStream, isStreaming, content } = useStreaming()
  const [taskDescription, setTaskDescription] = useState("")

  const handleGenerate = async () => {
    await startStream({
      task_description: taskDescription,
      task_type: "feature"
    })
  }

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="text-lg font-semibold mb-2">AI评论生成器</h3>
      <textarea
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        placeholder="输入任务描述..."
        className="w-full p-2 border rounded mb-2"
      />
      <button
        onClick={handleGenerate}
        disabled={isStreaming}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isStreaming ? '生成中...' : '生成评论'}
      </button>
      {content && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
          {content}
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>
      )}
    </div>
  )
}

export default JiraCommentGenerator
```

## 🛠 开发指南

### Plasmo特性

- **Content Scripts**: 在目标网站注入UI组件
- **Background Scripts**: 处理API调用和数据管理
- **Popup**: 扩展图标点击时显示的界面
- **Storage API**: 跨页面数据持久化
- **Messaging**: 组件间通信

### 开发最佳实践

1. **使用TypeScript**: 确保类型安全
2. **模块化组件**: 创建可复用的UI组件
3. **错误处理**: 妥善处理API错误和网络问题
4. **性能优化**: 避免不必要的重渲染
5. **用户体验**: 提供加载状态和错误反馈

## � 相关文档

- [Plasmo官方文档](https://docs.plasmo.com/) - Plasmo框架文档
- [后端文档](../backend/README.md) - 后端API文档
- [项目根目录](../README.md) - 项目概览和设置

---

**注意**: 这是一个基于Plasmo框架的浏览器扩展项目，专注于为AI工具箱提供无缝的浏览器集成体验。
