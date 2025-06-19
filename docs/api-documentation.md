# Sprint Planning Assistant API 文档

## 概述

Sprint Planning Assistant API 提供了一套完整的 RESTful 接口，用于 Sprint 规划分析、团队工作负载管理、假期影响评估、性能监控和 Jira Issue 详细信息获取。

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证**: 暂无（开发环境）
- **内容类型**: `application/json`
- **字符编码**: UTF-8

## API 端点

### 1. Jira Issue 信息获取

#### GET /jira/issue/{issue_key}/details

获取指定 Jira Issue 的详细信息，包括评论、附件、关联 issues 等。

**路径参数**:
- `issue_key` (string, required): Jira Issue Key，例如 "PROJ-123"

**查询参数**:
- `include_comments` (boolean, optional, default=true): 是否包含评论信息
- `include_attachments` (boolean, optional, default=true): 是否包含附件信息

**请求示例**:
```bash
GET /api/jira/issue/UC-70875/details?include_comments=true&include_attachments=true
```

**响应体**:
```json
{
  "success": true,
  "data": {
    "id": "12345",
    "key": "UC-70875",
    "summary": "Issue 标题",
    "description": "详细描述",
    "description_rendered": "渲染后的 HTML 描述",
    "status": {
      "id": "3",
      "name": "In Progress",
      "status_category": "indeterminate"
    },
    "issue_type": {
      "id": "10001",
      "name": "Story",
      "icon_url": "https://..."
    },
    "priority": {
      "id": "3",
      "name": "Medium",
      "icon_url": "https://..."
    },
    "assignee": {
      "id": "user123",
      "name": "John Doe",
      "display_name": "John Doe",
      "avatar": "https://...",
      "email_address": "john.doe@company.com"
    },
    "reporter": {
      "id": "user456",
      "name": "Jane Smith",
      "display_name": "Jane Smith",
      "avatar": "https://..."
    },
    "story_points": 5.0,
    "labels": ["frontend", "ui"],
    "created": "2024-01-01T10:00:00Z",
    "updated": "2024-01-15T14:30:00Z",
    "url": "https://jira.company.com/browse/UC-70875",
    "comments": [
      {
        "id": "comment123",
        "body": "评论内容",
        "rendered_body": "渲染后的评论 HTML",
        "author": {
          "id": "user789",
          "name": "Alice Johnson",
          "email": "alice@company.com",
          "avatar": "https://..."
        },
        "created": "2024-01-10T09:15:00Z",
        "updated": "2024-01-10T09:15:00Z"
      }
    ],
    "comments_count": 3,
    "attachments": [
      {
        "id": "att456",
        "filename": "design.pdf",
        "size": 2048576,
        "mime_type": "application/pdf",
        "content_url": "https://jira.company.com/attachment/456/design.pdf",
        "thumbnail_url": "https://jira.company.com/attachment/456/thumbnail",
        "author": {
          "id": "user123",
          "name": "John Doe"
        },
        "created": "2024-01-05T16:20:00Z"
      }
    ],
    "attachments_count": 2,
    "issue_links": [
      {
        "id": "link789",
        "type": {
          "name": "Blocks",
          "inward": "is blocked by",
          "outward": "blocks"
        },
        "direction": "outward",
        "linked_issue": {
          "key": "UC-70876",
          "summary": "相关 Issue 标题",
          "status": "To Do",
          "issue_type": "Bug"
        }
      }
    ],
    "issue_links_count": 1,
    "subtasks": [
      {
        "id": "sub123",
        "key": "UC-70875-1",
        "summary": "子任务标题",
        "status": "Done",
        "issue_type": "Subtask",
        "assignee": {
          "id": "user456",
          "name": "Jane Smith",
          "avatar": "https://..."
        }
      }
    ],
    "subtasks_count": 2,
    "votes": 3,
    "watches": 7,
    "environment": "生产环境",
    "environment_rendered": "生产环境"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Issue UC-12345 not found"
}
```

**状态码**:
- `200`: 成功
- `404`: Issue 不存在
- `500`: 服务器内部错误

---

#### GET /jira/issue/{issue_key}/basic

获取指定 Jira Issue 的基本信息（轻量级版本，不包含评论和附件）。

**路径参数**:
- `issue_key` (string, required): Jira Issue Key，例如 "PROJ-123"

**请求示例**:
```bash
GET /api/jira/issue/UC-70875/basic
```

**响应体**:
```json
{
  "success": true,
  "data": {
    "key": "UC-70875",
    "summary": "Issue 标题",
    "description": "详细描述",
    "status": {
      "id": "3",
      "name": "In Progress",
      "status_category": "indeterminate"
    },
    "issue_type": {
      "id": "10001",
      "name": "Story",
      "icon_url": "https://..."
    },
    "priority": {
      "id": "3",
      "name": "Medium",
      "icon_url": "https://..."
    },
    "assignee": {
      "id": "user123",
      "name": "John Doe",
      "display_name": "John Doe",
      "avatar": "https://..."
    },
    "reporter": {
      "id": "user456",
      "name": "Jane Smith",
      "display_name": "Jane Smith",
      "avatar": "https://..."
    },
    "created": "2024-01-01T10:00:00Z",
    "updated": "2024-01-15T14:30:00Z",
    "url": "https://jira.company.com/browse/UC-70875",
    "story_points": 5.0,
    "labels": ["frontend", "ui"]
  }
}
```

**状态码**:
- `200`: 成功
- `404`: Issue 不存在
- `500`: 服务器内部错误

---

### 2. Sprint Planning 分析

#### POST /sprint-planning/analyze

分析 Sprint 规划数据并生成 AI 驱动的建议。

**请求体**:
```json
{
  "boardId": "string",
  "sprintData": {
    "sprint": {
      "id": "string",
      "name": "string",
      "state": "active|closed|future",
      "boardId": "string",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-15T00:00:00Z"
    },
    "issues": [
      {
        "id": "string",
        "key": "string",
        "summary": "string",
        "storyPoints": 5,
        "assignee": {
          "id": "string",
          "name": "string"
        },
        "issueType": {
          "id": "string",
          "name": "string",
          "iconUrl": "string"
        },
        "status": {
          "id": "string",
          "name": "string",
          "statusCategory": "new|indeterminate|done"
        },
        "priority": {
          "id": "string",
          "name": "string",
          "iconUrl": "string"
        }
      }
    ],
    "totalStoryPoints": 42,
    "issuesByStatus": {},
    "issuesByAssignee": {}
  },
  "teamMembers": [
    {
      "id": "string",
      "name": "string",
      "displayName": "string",
      "avatar": "string",
      "timezone": "Asia/Shanghai"
    }
  ],
  "includeAIRecommendations": true,
  "stream": false
}
```

**响应体**:
```json
{
  "analysisResult": {
    "boardId": "string",
    "sprintSummary": {
      "sprintName": "string",
      "sprintState": "string",
      "issueCount": 10,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-15T00:00:00Z"
    },
    "analysisTimestamp": "2024-01-01T12:00:00Z"
  },
  "aiRecommendations": [
    "建议文本1",
    "建议文本2"
  ],
  "detailedRecommendations": [
    {
      "id": "string",
      "category": "capacity_optimization|risk_mitigation|process_improvement",
      "priority": "high|medium|low",
      "priorityScore": 85,
      "confidence": 0.92,
      "title": "建议标题",
      "description": "详细描述",
      "impact": "high|medium|low",
      "actionableSteps": [
        "步骤1",
        "步骤2"
      ],
      "expectedOutcome": "预期结果",
      "effortRequired": "high|medium|low",
      "timeline": "immediate|within_sprint|next_sprint"
    }
  ],
  "teamWorkload": {
    "memberWorkloads": {
      "user1": {
        "name": "张三",
        "currentSprintPoints": 8,
        "carryOverPoints": 2,
        "totalWorkload": 10,
        "issueCount": 3,
        "status": "normal|high|overloaded"
      }
    },
    "unassignedPoints": 5,
    "totalAssignedPoints": 37
  },
  "holidayImpact": {
    "holidaysInSprint": [
      {
        "region": "CN",
        "country": "中国",
        "holidayName": "春节",
        "startDate": "2024-02-10",
        "endDate": "2024-02-17",
        "dateRange": "02/10-02/17",
        "workingDaysAffected": 5
      }
    ],
    "impactAnalysis": {
      "affectedMembers": [
        {
          "memberId": "user1",
          "memberName": "张三",
          "holidayName": "春节",
          "region": "CN",
          "capacityReduction": 25.0,
          "workingDaysLost": 5
        }
      ],
      "totalCapacityReduction": 12.5,
      "holidaysCount": 1,
      "teamSize": 4
    },
    "recommendations": [
      "🏖️ 假期影响较大 (12.5% 容量减少)，建议减少 Sprint 承诺"
    ],
    "totalCapacityReduction": 12.5,
    "affectedMembersCount": 1,
    "success": true
  },
  "metrics": {
    "totalStoryPoints": 42,
    "teamVelocity": [35, 42, 38, 40, 36],
    "avgVelocity": 38.2,
    "utilizationRate": 105,
    "teamSize": 4
  },
  "model": "gpt-4",
  "tokensUsed": 1250,
  "success": true
}
```

**状态码**:
- `200`: 成功
- `400`: 请求参数错误
- `422`: 数据验证失败
- `500`: 服务器内部错误

---

### 3. 团队工作负载分析

#### POST /sprint-planning/team-workload

分析团队工作负载分布和平衡建议。

**请求体**: 与 `/analyze` 相同

**响应体**:
```json
{
  "memberWorkloads": {
    "user1": {
      "name": "张三",
      "currentSprintPoints": 8,
      "carryOverPoints": 2,
      "totalWorkload": 10,
      "issueCount": 3,
      "status": "normal|high|overloaded"
    }
  },
  "unassignedPoints": 5,
  "totalAssignedPoints": 37,
  "success": true
}
```

---

### 4. Board 信息

#### GET /sprint-planning/board-info/{board_id}

获取指定 Board 的基本信息。

**路径参数**:
- `board_id` (string): Board ID

**响应体**:
```json
{
  "boardId": "123",
  "boardName": "开发团队 Scrum Board",
  "projectKey": "DEV",
  "success": true
}
```

---

### 5. Sprint 数据

#### GET /sprint-planning/sprint-data/{board_id}

获取指定 Board 的 Sprint 数据。

**路径参数**:
- `board_id` (string): Board ID

**查询参数**:
- `sprint_id` (string, 可选): 特定 Sprint ID

**响应体**:
```json
{
  "sprintId": "sprint-123",
  "sprintName": "Sprint 1",
  "sprintState": "active",
  "issues": [...],
  "totalStoryPoints": 42,
  "success": true
}
```

---

### 6. 假期分析

#### POST /sprint-planning/holiday-analysis

分析假期对 Sprint 容量的影响。

**请求体**:
```json
{
  "sprintStartDate": "2024-02-01T00:00:00Z",
  "sprintEndDate": "2024-02-15T00:00:00Z",
  "teamMembers": [...],
  "regions": ["CN", "US", "IN"]
}
```

**响应体**:
```json
{
  "holidaysInSprint": [...],
  "impactAnalysis": {...},
  "recommendations": [...],
  "totalCapacityReduction": 12.5,
  "success": true
}
```

---

### 7. 性能监控

#### GET /sprint-planning/performance-metrics

获取系统性能指标。

**响应体**:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "apiPerformance": {
    "analyze_sprint_planning": {
      "totalCalls": 150,
      "successRate": 0.987,
      "errorRate": 0.013,
      "avgResponseTime": 1.234,
      "activeCalls": 2
    }
  },
  "cachePerformance": {
    "hitRate": 0.85,
    "totalRequests": 500,
    "cacheSize": 128
  },
  "systemHealth": {
    "concurrentUsers": 12,
    "cacheEntries": 128,
    "status": "healthy"
  },
  "alerts": []
}
```

#### GET /sprint-planning/health

系统健康检查。

**响应体**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "checks": {
    "apiPerformance": {
      "status": "healthy",
      "score": 95
    },
    "cachePerformance": {
      "status": "healthy",
      "score": 88
    },
    "systemResources": {
      "status": "healthy",
      "score": 92
    }
  },
  "overallScore": 92
}
```

---

### 8. GitHub Integration

#### POST /ai/github/pr-from-jira

Generates a GitHub Pull Request description by combining details from a Jira ticket and the code changes in the PR.

**请求体**:
```json
{
  "jira_ticket_id": "PROJ-123",
  "pr_title": "feat: Implement new login flow",
  "code_changes": "diff --git a/file.py b/file.py...",
  "branch_name": "feature/PROJ-123-new-login",
  "commit_messages": [
    "feat: add initial login structure",
    "fix: correct typo in login view"
  ]
}
```

**响应体 (Success 200 OK)**:
```json
{
  "generated_description": "### Description... (AI generated content)",
  "suggested_title": "feat(auth): Implement new user login flow based on PROJ-123",
  "model": "gpt-4",
  "tokens_used": 1520,
  "error": ""
}
```

**错误响应 (404 Not Found)**:
```json
{
  "detail": "Failed to retrieve Jira details: Jira ticket PROJ-123 not found or access denied."
}
```

**状态码**:
- `200`: 成功
- `404`: Jira Ticket 不存在或无权访问
- `500`: 服务器内部错误

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "errorCode": "E001",
  "timestamp": "2024-01-01T12:00:00Z",
  "details": {
    "field": "具体错误字段",
    "message": "详细错误信息"
  }
}
```

### 常见错误码

- `E001`: Board ID 无效
- `E002`: Sprint 数据格式错误
- `E003`: 团队成员数据缺失
- `E004`: API 调用频率超限
- `E005`: 服务暂时不可用

---

## 流式响应

对于支持流式响应的端点（如 `/analyze` 设置 `stream: true`），响应格式为 Server-Sent Events (SSE)：

```
data: 正在分析 Sprint 数据...

data: 检测到工作负载不平衡

data: 生成 AI 建议中...

data: [DONE]
```

错误格式：
```
data: [ERROR] 分析过程中发生错误
```

---

## 速率限制

- **标准端点**: 100 请求/分钟
- **分析端点**: 10 请求/分钟
- **健康检查**: 无限制

超出限制时返回 `429 Too Many Requests`。

---

## SDK 和示例

### JavaScript/TypeScript 示例

```typescript
// 基本分析请求
const analyzeSprintPlanning = async (data: SprintPlanningRequest) => {
  const response = await fetch('/api/v1/sprint-planning/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return await response.json();
};

// 流式响应处理
const analyzeWithStreaming = async (data: SprintPlanningRequest) => {
  const response = await fetch('/api/v1/sprint-planning/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({...data, stream: true})
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('Stream completed');
          return;
        } else if (data.startsWith('[ERROR]')) {
          throw new Error(data.slice(8));
        } else {
          console.log('Received:', data);
        }
      }
    }
  }
};
```

### Python 示例

```python
import requests
import json

# 基本分析请求
def analyze_sprint_planning(data):
    response = requests.post(
        'http://localhost:8000/api/v1/sprint-planning/analyze',
        json=data,
        headers={'Content-Type': 'application/json'}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API call failed: {response.status_code}")

# 健康检查
def check_health():
    response = requests.get('http://localhost:8000/api/v1/sprint-planning/health')
    return response.json()
```

---

## 版本控制

当前 API 版本: `v1`

版本控制策略：
- 主要版本变更：不兼容的 API 变更
- 次要版本变更：向后兼容的功能添加
- 补丁版本变更：向后兼容的错误修复

---

## 支持和反馈

如有 API 相关问题：
1. 查看错误响应中的详细信息
2. 检查请求格式是否符合文档规范
3. 联系技术支持团队

API 文档更新日志：
- v1.0.0: 初始版本发布
- 后续版本将在此处记录变更
