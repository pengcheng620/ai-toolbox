# GitHub PR 描述编辑自动化

## 概述

本功能实现了GitHub Pull Request描述的自动化编辑流程，包括：

1. **自动点击编辑按钮**：程序化触发GitHub PR描述的编辑模式
2. **智能内容填充**：将AI生成的描述内容自动填入编辑区域

## 技术实现

### 核心流程

```typescript
const setCommentArea = async (text: string) => {
  try {
    // 步骤1: 点击编辑按钮打开编辑模式
    const editButtonClicked = await clickEditButton()
    if (!editButtonClicked) {
      // 回退到直接访问textarea
      return await setTextareaDirectly(text)
    }

    // 步骤2: 等待编辑模式加载并填充textarea
    await waitForEditMode()
    return await fillEditModeTextarea(text)
  } catch (error) {
    // 错误处理和回退机制
    return await setTextareaDirectly(text)
  }
}
```

### 关键组件

#### 1. 编辑按钮识别 (`clickEditButton`)

目标元素特征：
- 元素类型：`<button>`
- CSS类名：`dropdown-item btn-link js-comment-edit-button`
- 角色属性：`role="menuitem"`
- 无障碍标签：`aria-label="Edit comment"`
- 按钮文本：`Edit`

```typescript
const clickEditButton = async (): Promise<boolean> => {
  const strategy = getGitHubPageStrategy()
  const editButton = strategy.findEditButton()
  
  if (!editButton) {
    console.warn("Edit button not found")
    return false
  }

  const clickEvent = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window
  })
  editButton.dispatchEvent(clickEvent)
  return true
}
```

#### 2. 编辑模式等待 (`waitForEditMode`)

等待编辑模式的textarea元素出现：

```typescript
const waitForEditMode = async (maxWaitTime = 3000): Promise<void> => {
  const strategy = getGitHubPageStrategy()
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const editTextarea = strategy.findEditModeTextarea()
      if (editTextarea) {
        clearInterval(checkInterval)
        resolve()
      }
      // 超时检查...
    }, 100)
  })
}
```

#### 3. 内容填充 (`fillEditModeTextarea`)

目标textarea特征：
- 元素类型：`<textarea>`
- name属性：`pull_request[body]`
- 动态ID：`issue-*-body`（处理动态ID）
- 无障碍标签：`aria-label="Comment body"`

```typescript
const fillEditModeTextarea = async (text: string): Promise<void> => {
  const strategy = getGitHubPageStrategy()
  const editTextarea = strategy.findEditModeTextarea()

  if (!editTextarea) {
    throw new Error("Edit mode textarea not found")
  }

  editTextarea.value = text
  editTextarea.textContent = text

  // 触发事件确保变更被注册
  const inputEvent = new Event("input", { bubbles: true })
  const changeEvent = new Event("change", { bubbles: true })
  
  editTextarea.dispatchEvent(inputEvent)
  editTextarea.dispatchEvent(changeEvent)
  editTextarea.focus()
}
```

### 策略模式支持

使用策略模式支持不同的GitHub环境（公共GitHub vs 企业GitHub）：

```typescript
export interface GitHubPageStrategy {
  findEditButton(): HTMLButtonElement | null
  findEditModeTextarea(): HTMLTextAreaElement | null
  // ... 其他方法
}

class PublicGitHubStrategy implements GitHubPageStrategy {
  findEditButton(): HTMLButtonElement | null {
    const selectors = [
      'button.dropdown-item.btn-link.js-comment-edit-button[role="menuitem"][aria-label="Edit comment"]',
      'button.js-comment-edit-button[aria-label="Edit comment"]',
      // ... 更多选择器
    ]
    // 实现逻辑...
  }
}
```

## 错误处理和回退机制

### 多层回退策略

1. **主要流程**：编辑按钮 → 等待编辑模式 → 填充内容
2. **第一层回退**：如果编辑按钮点击失败，直接访问textarea
3. **第二层回退**：如果编辑模式等待超时，使用直接访问
4. **第三层回退**：如果所有方法失败，显示错误通知

### 用户通知

```typescript
// 成功通知
addNotification({
  type: "success",
  title: "Generation Successful",
  message: "PR description has been generated and filled."
})

// 警告通知（使用回退方法）
addNotification({
  type: "warning",
  title: "Edit Mode Unavailable",
  message: "Using fallback method to fill description."
})
```

## 配置参数

```typescript
// 编辑模式处理常量
const EDIT_MODE_WAIT_TIME = 3000 // 3秒等待时间
const EDIT_MODE_CHECK_INTERVAL = 100 // 100ms检查间隔
```

## 测试

### 测试页面

使用 `frontend/test-github-edit.html` 进行功能测试：

1. 打开测试页面
2. 使用"Test Full Workflow"按钮测试完整流程
3. 查看测试日志了解执行详情

### 测试场景

- ✅ 编辑按钮识别和点击
- ✅ 编辑模式等待和检测
- ✅ 内容填充和事件触发
- ✅ 错误处理和回退机制
- ✅ 不同GitHub环境支持

## 使用方法

1. 在GitHub PR页面上，点击AI工具箱的"Generate"按钮
2. 系统会自动：
   - 提取PR信息和Jira票据
   - 调用AI生成描述
   - 自动点击编辑按钮
   - 填充生成的内容
3. 用户可以进一步编辑内容并保存

## 兼容性

- ✅ GitHub.com (公共GitHub)
- ✅ git.autodesk.com (企业GitHub)
- ✅ 动态ID处理
- ✅ 多种选择器回退
- ✅ 事件兼容性

## 故障排除

### 常见问题

1. **编辑按钮未找到**
   - 检查页面是否完全加载
   - 确认用户有编辑权限
   - 查看控制台日志

2. **编辑模式超时**
   - 网络延迟可能导致加载缓慢
   - 系统会自动回退到直接方法

3. **内容未填充**
   - 检查textarea选择器是否正确
   - 确认事件触发是否成功

### 调试信息

所有操作都有详细的控制台日志：
- `🔄 Starting setCommentArea process...`
- `📝 Step 1: Attempting to click edit button...`
- `⏳ Step 2: Waiting for edit mode to load...`
- `✏️ Step 3: Filling edit mode textarea...`
