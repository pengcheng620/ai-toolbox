# Jira REST API Integration Guide

## 📋 概述

Sprint Planning Assistant 支持通过 Jira REST API 获取实时数据，提供比 DOM 解析更可靠和完整的数据源。

## 🔧 配置步骤

### 1. 生成 Jira API Token

1. 登录您的 Atlassian 账户
2. 访问 [API Tokens 页面](https://id.atlassian.com/manage-profile/security/api-tokens)
3. 点击 "Create API token"
4. 输入标签名称（如 "Sprint Planning Assistant"）
5. 复制生成的 token（仅显示一次）

### 2. 配置环境变量

在 `backend/.env` 文件中添加以下配置：

```bash
# Jira API Integration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
JIRA_ENABLE_API=true
JIRA_API_TIMEOUT=30
JIRA_DEFAULT_PROJECT=PROJ
```

### 3. 验证配置

```bash
# 启动后端服务
cd backend
python -m app.main

# 测试 API 连接
curl -X GET "http://localhost:8000/api/v1/sprint-planning/board-info/123"
```

## 🚀 功能特性

### ✅ 已支持的功能

1. **Board 信息获取**
   - Board 名称和类型
   - 项目键和项目名称
   - Board 配置信息

2. **Sprint 数据获取**
   - 活跃 Sprint 自动检测
   - Sprint 基本信息（名称、状态、日期）
   - Sprint 目标

3. **Issue 数据提取**
   - 完整的 Issue 信息
   - 自动识别 Story Points 字段
   - Assignee 和 Reporter 信息
   - Issue 类型、状态、优先级

4. **团队成员信息**
   - 项目可分配用户
   - 用户头像和联系信息
   - 用户活跃状态

### 🔄 数据源切换

系统支持智能数据源切换：

1. **API 优先**：如果 Jira API 配置正确，优先使用 API 数据
2. **DOM 后备**：API 不可用时，自动降级到 DOM 解析
3. **Mock 数据**：开发环境下的模拟数据支持

### 📊 数据质量对比

| 特性 | DOM 解析 | REST API |
|------|----------|----------|
| 数据完整性 | ⚠️ 部分 | ✅ 完整 |
| 历史数据 | ❌ 无 | ✅ 支持 |
| 跨项目支持 | ❌ 无 | ✅ 支持 |
| 稳定性 | ⚠️ 依赖UI | ✅ 稳定 |
| 实时性 | ✅ 实时 | ✅ 实时 |
| 配置复杂度 | ✅ 简单 | ⚠️ 需配置 |

## 🔒 安全考虑

### API Token 安全

1. **存储安全**：
   - 使用环境变量存储 API Token
   - 不要将 Token 提交到版本控制
   - 定期轮换 API Token

2. **权限最小化**：
   - 创建专用的服务账号
   - 仅授予必要的项目访问权限
   - 使用只读权限（如可能）

3. **网络安全**：
   - 使用 HTTPS 连接
   - 配置适当的超时时间
   - 实施请求频率限制

## 📈 性能优化

### 缓存策略

```python
# 示例：Board 信息缓存 30 分钟
@performance_monitor.cache_result("board_info", ttl_seconds=1800)
async def get_board_info(board_id: str):
    # API 调用逻辑
```

### 批量请求

```python
# 示例：批量获取多个 Sprint 的数据
async def get_multiple_sprints(board_id: str, sprint_ids: List[str]):
    tasks = [get_sprint_issues(sid) for sid in sprint_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

### 请求优化

1. **并发控制**：限制并发请求数量
2. **重试机制**：实施指数退避重试
3. **连接池**：复用 HTTP 连接

## 🐛 故障排除

### 常见问题

1. **401 Unauthorized**
   ```bash
   # 检查用户名和 API Token
   curl -u "email@company.com:api-token" \
     "https://your-company.atlassian.net/rest/api/2/myself"
   ```

2. **403 Forbidden**
   - 检查用户权限
   - 确认项目访问权限
   - 验证 Board 访问权限

3. **404 Not Found**
   - 验证 Board ID 正确性
   - 检查 Sprint ID 有效性
   - 确认资源存在

4. **连接超时**
   - 检查网络连接
   - 调整 `JIRA_API_TIMEOUT` 设置
   - 验证防火墙配置

### 调试模式

```bash
# 启用详细日志
LOG_LEVEL=DEBUG python -m app.main

# 检查 Jira API 状态
curl -X GET "http://localhost:8000/api/v1/sprint-planning/health"
```

## 📚 API 参考

### Board 信息

```http
GET /api/v1/sprint-planning/board-info/{board_id}
```

### Sprint 数据

```http
GET /api/v1/sprint-planning/sprint-data/{board_id}?sprint_id={sprint_id}
```

### 完整分析

```http
POST /api/v1/sprint-planning/analyze
Content-Type: application/json

{
  "boardId": "123",
  "sprintData": {...},
  "teamMembers": [...],
  "includeAIRecommendations": true
}
```

## 🔮 未来规划

### 计划中的功能

1. **增强 API 支持**
   - Jira Cloud/Server 通用支持
   - OAuth 2.0 认证
   - Webhook 集成

2. **数据分析扩展**
   - 历史速度分析
   - 团队表现趋势
   - 预测性分析

3. **集成优化**
   - GraphQL API 支持
   - 实时数据同步
   - 离线模式支持

---

## 💡 最佳实践

1. **渐进式启用**：先在测试环境验证，再在生产环境启用
2. **监控配置**：设置 API 调用监控和告警
3. **备份策略**：保持 DOM 解析作为后备方案
4. **文档维护**：及时更新 API 字段映射配置 