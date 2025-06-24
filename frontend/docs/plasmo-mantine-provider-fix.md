# Plasmo MantineProvider 错误修复

## 问题描述

在 Plasmo 环境中使用 Mantine 组件时出现错误：
```
common.88ea990f.js:33594 Uncaught Error: @mantine/core: MantineProvider was not found in component tree, make sure you have it in your app
```

## 根本原因

在 Plasmo 浏览器扩展框架中，每个 content script 都运行在独立的上下文中。当组件使用 Mantine 组件（如 Modal、Button 等）时，需要在该 content script 的组件树中提供 MantineProvider。

## 解决方案

### 1. 为 GitHub PR Content Script 添加 MantineProvider

**文件**: `frontend/src/contents/github-pr.tsx`

#### 添加必要的导入：
```typescript
import mantineCssText from "data-text:@mantine/core/styles.css"
import { ThemeProvider } from "~theme"
import "@mantine/core/styles.css"
```

#### 更新样式函数：
```typescript
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = mantineCssText + cssText
  return style
}
```

#### 包装组件：
```typescript
const PlasmoOverlay = () => {
  return (
    <ThemeProvider>
      <AddDescription />
    </ThemeProvider>
  )
}
```

### 2. 验证其他 Content Scripts

#### Common Content Script (已正确配置)
**文件**: `frontend/src/contents/common.tsx`

已经正确配置了 MantineProvider：
```typescript
const PlasmoOverlay = () => {
  setMantineColorScheme("light")
  return (
    <ThemeProvider>
      <AwNotification />
    </ThemeProvider>
  )
}
```

#### 其他 Content Scripts
- `jira.tsx` - 不使用 Mantine 组件，无需修改
- `jira-sprint-planning.tsx` - 不使用 Mantine 组件，无需修改
- `github-new-pr.tsx` - 需要检查是否使用 Mantine 组件

## ThemeProvider 配置

**文件**: `frontend/src/theme.tsx`

```typescript
import {createTheme, MantineProvider} from "@mantine/core"

const theme = createTheme({})
export const ThemeProvider = ({children}) => {
    return (
        <MantineProvider
            //https://github.com/PlasmoHQ/plasmo/issues/776#issuecomment-1811072653
            cssVariablesSelector=":host"
            theme={theme}>
            {children}
        </MantineProvider>
    )
}
```

关键配置：
- `cssVariablesSelector=":host"` - 确保 CSS 变量在 Shadow DOM 中正确工作

## 最佳实践

### 1. Content Script 结构模式
```typescript
// 导入 Mantine CSS
import mantineCssText from "data-text:@mantine/core/styles.css"
import cssText from "data-text:~style.css"
import { ThemeProvider } from "~theme"
import "@mantine/core/styles.css"

// 样式函数
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = mantineCssText + cssText
  return style
}

// 组件包装
const PlasmoOverlay = () => {
  return (
    <ThemeProvider>
      <YourComponent />
    </ThemeProvider>
  )
}
```

### 2. 检查清单

在添加新的 content script 或使用 Mantine 组件时：

1. ✅ 导入 `mantineCssText` 和 `ThemeProvider`
2. ✅ 在 `getStyle()` 中包含 Mantine CSS
3. ✅ 用 `ThemeProvider` 包装根组件
4. ✅ 确保 `@mantine/core/styles.css` 被导入
5. ✅ 测试构建和运行时功能

### 3. 常见错误

❌ **错误**: 忘记包装 ThemeProvider
```typescript
const PlasmoOverlay = () => {
  return <ComponentWithMantineElements />  // 会报错
}
```

✅ **正确**: 使用 ThemeProvider 包装
```typescript
const PlasmoOverlay = () => {
  return (
    <ThemeProvider>
      <ComponentWithMantineElements />
    </ThemeProvider>
  )
}
```

❌ **错误**: 忘记包含 Mantine CSS
```typescript
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText  // 缺少 mantineCssText
  return style
}
```

✅ **正确**: 包含所有必要的 CSS
```typescript
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = mantineCssText + cssText
  return style
}
```

## 验证

### 构建测试
```bash
cd frontend
npm run build
```

### 运行时测试
1. 加载扩展到浏览器
2. 访问 GitHub PR 页面
3. 测试使用 Mantine 组件的功能（如 Modal）
4. 检查控制台是否有 MantineProvider 错误

## 相关文件

### 已修复的 Content Scripts
- `frontend/src/contents/github-pr.tsx` - GitHub PR 页面，使用 AddDescription 组件
- `frontend/src/contents/github-new-pr.tsx` - GitHub 新建 PR 页面，使用 AddDescription 组件
- `frontend/src/contents/common.tsx` - 通用通知组件，已正确配置
- `frontend/src/contents/side-widget.tsx` - 侧边栏组件，已正确配置

### 配置文件
- `frontend/src/theme.tsx` - ThemeProvider 配置

### 使用 Mantine 组件的文件
- `frontend/src/components/github/add-description.tsx` - 使用 Mantine Modal 的组件
- `frontend/src/components/common/notification.tsx` - 使用 Mantine Notification 的组件

### 测试文件
- `frontend/src/test/mantine-provider-test.tsx` - MantineProvider 功能测试组件

## 参考资源

- [Plasmo Shadow DOM 问题](https://github.com/PlasmoHQ/plasmo/issues/776#issuecomment-1811072653)
- [Mantine Provider 文档](https://mantine.dev/theming/mantine-provider/)
- [Plasmo Content Scripts 文档](https://docs.plasmo.com/framework/content-scripts)
