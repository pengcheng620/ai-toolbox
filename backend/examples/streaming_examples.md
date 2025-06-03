# Universal Streaming Examples

本文档展示了如何使用AI Toolbox Backend的通用流式传输功能。

## 概述

所有AI接口现在都支持通过 `stream` 参数来控制是否使用流式传输：

- `"stream": false` (默认) - 返回完整响应
- `"stream": true` - 返回实时流式响应

## 基础用法

### 1. 文本生成 (Text Generation)

```bash
# 非流式请求
curl -X POST "http://localhost:8000/api/v1/ai/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "解释什么是机器学习",
    "stream": false,
    "max_tokens": 500,
    "temperature": 0.7
  }'

# 流式请求
curl -X POST "http://localhost:8000/api/v1/ai/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "解释什么是机器学习",
    "stream": true,
    "max_tokens": 500,
    "temperature": 0.7
  }'
```

### 2. Jira任务评论生成

```bash
# 非流式Jira评论生成
curl -X POST "http://localhost:8000/api/v1/ai/jira/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "实现用户认证系统",
    "task_type": "feature",
    "context": {
      "priority": "high",
      "estimated_hours": 16
    },
    "stream": false
  }'

# 流式Jira评论生成
curl -X POST "http://localhost:8000/api/v1/ai/jira/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "修复登录页面的响应式布局问题",
    "task_type": "bug",
    "context": {
      "severity": "medium",
      "browser": "Chrome, Firefox"
    },
    "stream": true
  }'
```

### 3. GitHub PR描述生成

```bash
# 非流式PR描述生成
curl -X POST "http://localhost:8000/api/v1/ai/github/pr" \
  -H "Content-Type: application/json" \
  -d '{
    "pr_title": "feat: Add dark mode support",
    "code_changes": "Added theme toggle, updated CSS variables, implemented localStorage persistence",
    "branch_name": "feature/dark-mode",
    "commit_messages": ["feat: add theme toggle", "style: update CSS for dark mode"],
    "stream": false
  }'

# 流式PR描述生成
curl -X POST "http://localhost:8000/api/v1/ai/github/pr" \
  -H "Content-Type: application/json" \
  -d '{
    "pr_title": "fix: Resolve memory leak in data processing",
    "code_changes": "Optimized data cleanup, fixed event listener removal, improved garbage collection",
    "branch_name": "bugfix/memory-leak",
    "commit_messages": ["fix: cleanup data processing", "perf: optimize memory usage"],
    "stream": true
  }'
```

## JavaScript/TypeScript 示例

### 基础流式处理函数

```javascript
async function handleStreamingResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return fullContent;
        }
        
        fullContent += data;
        console.log('Received chunk:', data);
        
        // 在这里更新UI
        updateUI(data, fullContent);
      }
    }
  }
  
  return fullContent;
}
```

### 通用AI客户端

```javascript
class AIToolboxClient {
  constructor(baseUrl = 'http://localhost:8000/api/v1') {
    this.baseUrl = baseUrl;
  }
  
  async request(endpoint, data, options = {}) {
    const { stream = false, onChunk } = options;
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, stream })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (stream) {
      return this.handleStreamingResponse(response, onChunk);
    } else {
      return await response.json();
    }
  }
  
  async handleStreamingResponse(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return fullContent;
          
          fullContent += data;
          if (onChunk) onChunk(data, fullContent);
        }
      }
    }
    
    return fullContent;
  }
  
  // 文本生成
  async generateText(prompt, options = {}) {
    return this.request('/ai/generate', { prompt, ...options }, options);
  }
  
  // Jira评论生成
  async generateJiraComment(taskDescription, options = {}) {
    return this.request('/ai/jira/generate', {
      task_description: taskDescription,
      ...options
    }, options);
  }
  
  // GitHub PR描述生成
  async generateGitHubPR(prTitle, codeChanges, options = {}) {
    return this.request('/ai/github/pr', {
      pr_title: prTitle,
      code_changes: codeChanges,
      ...options
    }, options);
  }
  
  // 简单聊天
  async simpleChat(message, options = {}) {
    return this.request('/ai/chat/simple', { message, ...options }, options);
  }
}
```

### 使用示例

```javascript
const aiClient = new AIToolboxClient();

// 示例1: 非流式文本生成
async function generateTextExample() {
  try {
    const result = await aiClient.generateText('解释什么是React Hooks', {
      max_tokens: 300,
      temperature: 0.7,
      stream: false
    });
    
    console.log('Generated text:', result.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例2: 流式文本生成
async function streamingTextExample() {
  try {
    const result = await aiClient.generateText('写一个Python快速排序算法', {
      max_tokens: 500,
      temperature: 0.5,
      stream: true,
      onChunk: (chunk, fullContent) => {
        console.log('New chunk:', chunk);
        document.getElementById('output').textContent = fullContent;
      }
    });
    
    console.log('Final result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例3: 流式Jira评论生成
async function streamingJiraExample() {
  try {
    const result = await aiClient.generateJiraComment(
      '实现用户权限管理系统，包括角色分配和权限验证',
      {
        task_type: 'feature',
        context: {
          priority: 'high',
          estimated_hours: 24,
          team: 'backend'
        },
        stream: true,
        onChunk: (chunk, fullContent) => {
          updateJiraCommentPreview(fullContent);
        }
      }
    );
    
    console.log('Jira comment generated:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例4: 流式GitHub PR描述生成
async function streamingGitHubPRExample() {
  try {
    const result = await aiClient.generateGitHubPR(
      'feat: Implement real-time notifications',
      `
      - Added WebSocket connection for real-time updates
      - Implemented notification queue system
      - Created notification UI components
      - Added user preference settings
      - Integrated with backend notification service
      `,
      {
        branch_name: 'feature/real-time-notifications',
        commit_messages: [
          'feat: add WebSocket connection',
          'feat: implement notification queue',
          'ui: create notification components',
          'feat: add user preferences'
        ],
        stream: true,
        onChunk: (chunk, fullContent) => {
          updatePRDescriptionPreview(fullContent);
        }
      }
    );
    
    console.log('PR description generated:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## React组件示例

```jsx
import React, { useState, useCallback } from 'react';

const StreamingTextGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStream, setUseStream] = useState(true);
  
  const aiClient = new AIToolboxClient();
  
  const generateText = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setIsStreaming(true);
    setResult('');
    
    try {
      const response = await aiClient.generateText(prompt, {
        max_tokens: 500,
        temperature: 0.7,
        stream: useStream,
        onChunk: useStream ? (chunk, fullContent) => {
          setResult(fullContent);
        } : undefined
      });
      
      if (!useStream) {
        setResult(response.text);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setResult('生成失败: ' + error.message);
    } finally {
      setIsStreaming(false);
    }
  }, [prompt, useStream]);
  
  return (
    <div className="streaming-generator">
      <div className="controls">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入你的提示词..."
          rows={3}
          className="prompt-input"
        />
        
        <div className="options">
          <label>
            <input
              type="checkbox"
              checked={useStream}
              onChange={(e) => setUseStream(e.target.checked)}
            />
            启用流式传输
          </label>
          
          <button
            onClick={generateText}
            disabled={isStreaming || !prompt.trim()}
            className="generate-btn"
          >
            {isStreaming ? '生成中...' : '生成文本'}
          </button>
        </div>
      </div>
      
      <div className="result">
        <h3>生成结果:</h3>
        <div className={`result-content ${isStreaming ? 'streaming' : ''}`}>
          {result || '点击生成按钮开始...'}
        </div>
      </div>
    </div>
  );
};

export default StreamingTextGenerator;
```

## 性能对比

### 流式传输的优势

1. **更好的用户体验**: 用户可以立即看到内容开始生成
2. **感知性能提升**: 即使总时间相同，用户感觉更快
3. **实时反馈**: 可以提前判断生成方向是否正确
4. **减少等待焦虑**: 持续的视觉反馈减少用户焦虑

### 非流式传输的优势

1. **简单处理**: 一次性获取完整结果，处理逻辑简单
2. **完整性保证**: 确保获得完整的响应内容
3. **错误处理**: 更容易处理生成过程中的错误
4. **缓存友好**: 完整响应更容易缓存

## 最佳实践

1. **根据场景选择**: 长文本生成使用流式，短文本可以使用非流式
2. **错误处理**: 流式传输需要更复杂的错误处理逻辑
3. **UI设计**: 为流式传输设计合适的加载状态和进度指示
4. **性能监控**: 监控流式传输的性能和用户体验指标

## 故障排除

### 常见问题

1. **流式响应中断**: 检查网络连接和服务器状态
2. **内容不完整**: 确保正确处理 `[DONE]` 标记
3. **编码问题**: 使用正确的文本解码器处理UTF-8内容
4. **内存泄漏**: 及时清理流式响应的资源

### 调试技巧

```javascript
// 启用详细日志
const debugClient = new AIToolboxClient();
debugClient.handleStreamingResponse = async function(response, onChunk) {
  console.log('Starting streaming response...');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let chunkCount = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log(`Streaming completed. Total chunks: ${chunkCount}`);
      break;
    }
    
    const chunk = decoder.decode(value);
    console.log(`Chunk ${++chunkCount}:`, chunk);
    
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('Received DONE signal');
          return fullContent;
        }
        
        fullContent += data;
        if (onChunk) onChunk(data, fullContent);
      }
    }
  }
  
  return fullContent;
};
``` 