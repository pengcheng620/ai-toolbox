# Personal Access Token (PAT) 测试指南

## 步骤 1: 创建 Personal Access Token

### 在 Autodesk Jira 中创建 PAT：

1. 登录到 https://jira.autodesk.com
2. 点击右上角的头像
3. 选择 **Profile**
4. 在左侧菜单中选择 **Personal access tokens**
5. 点击 **Create token**
6. 填写：
   - **Name**: 例如 "API Testing Token"
   - **Expiration**: 选择合适的过期时间（建议30-90天）
7. 点击 **Create**
8. **立即复制生成的 token**（只显示一次！）

## 步骤 2: 设置环境变量

在终端中运行以下命令：

```bash
# 设置 Jira 基础 URL
export JIRA_BASE_URL="https://jira.autodesk.com"

# 设置认证方式为 PAT
export JIRA_AUTH_METHOD="pat"

# 设置您的 Personal Access Token（替换为实际的 token）
export JIRA_PERSONAL_ACCESS_TOKEN="您刚才创建的PAT_Token"

# 启用 API
export JIRA_ENABLE_API="true"
```

## 步骤 3: 验证环境变量设置

```bash
# 检查环境变量是否设置正确
echo "JIRA_BASE_URL: $JIRA_BASE_URL"
echo "JIRA_AUTH_METHOD: $JIRA_AUTH_METHOD"
echo "JIRA_PERSONAL_ACCESS_TOKEN: ${JIRA_PERSONAL_ACCESS_TOKEN:0:10}..."
echo "JIRA_ENABLE_API: $JIRA_ENABLE_API"
```

## 步骤 4: 运行测试脚本

### 4.1 简单测试（推荐先运行）

```bash
cd backend
python test_pat_simple.py
```

预期成功输出：
```
🎯 PAT 认证简单测试
==================================================
🔍 直接测试 PAT 认证
----------------------------------------
Base URL: https://jira.autodesk.com
认证方式: pat
PAT Token: ***XXXX

🔗 测试连接到: https://jira.autodesk.com

📞 调用: https://jira.autodesk.com/rest/api/2/myself
状态码: 200
✅ 成功!
  用户名: 您的姓名
  邮箱: pengcheng.lu@autodesk.com

📞 调用: https://jira.autodesk.com/rest/api/2/search?jql=key=PDM-46999&maxResults=1
状态码: 200
✅ 成功!
  找到票据数量: 1
  票据: PDM-46999
  标题: 票据标题
```

### 4.2 完整测试

```bash
python test_pat_authentication.py
```

## 步骤 5: 故障排除

### 常见错误及解决方案：

#### 错误 1: 401 Unauthorized
```
状态码: 401
💡 可能是 PAT Token 无效或过期
```
**解决方案**：
- 检查 PAT Token 是否正确复制
- 确认 Token 没有过期
- 重新创建一个新的 PAT

#### 错误 2: 403 Forbidden
```
状态码: 403
💡 可能是权限不足或认证方式不正确
```
**解决方案**：
- 确认您有访问该项目的权限
- 检查 PAT 的作用域设置
- 联系 Jira 管理员确认权限

#### 错误 3: 环境变量未设置
```
❌ 缺少必要的环境变量!
```
**解决方案**：
- 重新执行步骤 2 中的 export 命令
- 确保在同一个终端会话中运行测试

## 步骤 6: 验证完整功能

如果简单测试通过，可以运行完整的集成测试：

```bash
# 测试现有的集成（仍使用 Basic Auth）
python test_specific_ticket.py

# 测试新的 PAT 集成
python test_pat_authentication.py
```

## 预期结果

成功的测试应该显示：
1. ✅ 配置检查通过
2. ✅ 搜索成功! 找到 1 个匹配的票据
3. 显示完整的 PDM-46999 票据信息
4. 包括：标题、描述、状态、指派人等详细信息

## 注意事项

1. **安全性**：PAT Token 具有您账户的完整权限，请妥善保管
2. **过期时间**：建议设置适当的过期时间，定期更新
3. **作用域**：根据需要限制 Token 的访问范围
4. **环境变量**：不要将 PAT Token 提交到代码仓库中

## 下一步

成功测试后，您可以：
1. 将 PAT 配置集成到您的应用中
2. 使用 PAT 访问其他 Jira API 端点
3. 实现自动化的 Jira 集成功能 