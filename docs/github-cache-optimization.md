# GitHub PR Data Cache Optimization

## 概述

GitHub PR描述生成功能的缓存优化系统，旨在减少重复的API调用和页面抓取，提升用户体验和系统性能。

## 功能特性

### 🚀 核心功能
- **智能缓存**: 自动缓存commit信息、文件变更、代码变更和commit消息
- **LRU淘汰策略**: 自动管理内存使用，淘汰最少使用的缓存条目
- **差异化TTL**: 不同类型数据使用不同的过期时间
- **缓存预热**: 页面加载时自动预取数据
- **性能监控**: 实时统计缓存命中率和性能指标

### 📊 性能优化
- **减少网络请求**: 缓存命中时避免重复的API调用和页面抓取
- **提升响应速度**: 缓存数据的访问速度比网络请求快10-100倍
- **降低服务器负载**: 减少对GitHub API和页面的请求频率
- **改善用户体验**: 更快的PR描述生成响应时间

## 架构设计

### 缓存层次结构
```
┌─────────────────────────────────────┐
│           用户界面层                 │
│    (add-description.tsx)            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           业务逻辑层                 │
│  (github-pr-page-service.ts)       │
│  (github.ts - GitHubPageStrategy)  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│            缓存服务层                │
│    (github-cache-service.ts)       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           数据存储层                 │
│        (内存Map存储)                │
└─────────────────────────────────────┘
```

### 缓存键策略
- **格式**: `{normalized_pr_url}:{data_type}`
- **示例**: `https://github.com/org/repo/pull/123:commits`
- **数据类型**: `commits`, `fileChanges`, `codeChanges`, `commitMessages`

## 配置选项

### 默认配置
```typescript
{
  maxEntries: 10,           // 最大缓存条目数
  defaultTTL: 5 * 60 * 1000, // 默认5分钟过期
  commitsTTL: 10 * 60 * 1000, // commit数据10分钟过期
  enableStats: true,        // 启用统计
  enableDebugLogs: true,    // 启用调试日志
  enableWarmUp: true        // 启用缓存预热
}
```

### 环境配置
- **开发环境**: 更短的TTL，更详细的日志
- **生产环境**: 更大的缓存容量，关闭调试日志

## 使用方法

### 基本使用
缓存系统自动集成到现有的数据获取流程中，无需手动调用：

```typescript
// 自动使用缓存
const commits = await fetchPRCommitMessages()
const fileChanges = await fetchPRFileChanges()
const codeChanges = await strategy.getCodeChanges()
```

### 缓存管理
```typescript
// 清除当前PR的所有缓存
GitHubCacheManager.clearCurrentPR()

// 清除特定类型的缓存
GitHubCacheManager.clearCurrentPRData('commits')

// 预热缓存
await GitHubCacheManager.warmUpCurrentPR()

// 查看缓存状态
GitHubCacheManager.getCurrentPRCacheStatus()
```

### 调试工具
在浏览器控制台中可用的全局方法：

```javascript
// 查看缓存统计
cacheStats()

// 查看详细调试信息
cacheDebug()

// 清除当前PR缓存
clearPRCache()

// 预热缓存
warmUpCache()

// 运行性能测试
runCacheTests()
```

## 性能指标

### 预期性能提升
- **缓存命中时**: 响应时间 < 10ms
- **缓存未命中时**: 响应时间 500-2000ms
- **目标命中率**: > 70%
- **内存使用**: < 50MB

### 监控指标
- **命中率**: 缓存命中次数 / 总请求次数
- **平均响应时间**: 区分缓存命中和未命中
- **内存使用量**: 当前缓存占用的内存大小
- **淘汰次数**: LRU策略触发的淘汰次数

## 边界情况处理

### PR更新检测
- **手动刷新**: 提供清除缓存的方法
- **智能检测**: 未来可考虑基于页面内容变化检测

### 网络错误处理
- **优雅降级**: 网络错误时返回过期缓存
- **重试机制**: 配置重试次数和延迟
- **错误隔离**: 单个数据类型错误不影响其他类型

### 内存管理
- **LRU淘汰**: 自动淘汰最少使用的条目
- **内存监控**: 监控总内存使用量
- **配置限制**: 可配置最大条目数和内存限制

## 测试和验证

### 性能测试
```typescript
// 运行完整性能测试
const report = await cachePerformanceTester.runPerformanceTests()

// 测试内存使用
const memoryReport = await cachePerformanceTester.testMemoryUsage()

// 测试缓存过期
const expirationReport = await cachePerformanceTester.testCacheExpiration()
```

### 验证步骤
1. **功能验证**: 确保缓存不影响数据正确性
2. **性能验证**: 测量缓存命中率和响应时间
3. **内存验证**: 监控内存使用和淘汰行为
4. **边界验证**: 测试错误处理和过期机制

## 故障排除

### 常见问题

#### 缓存命中率低
- 检查TTL配置是否过短
- 确认用户使用模式是否符合预期
- 查看是否有频繁的缓存清除操作

#### 内存使用过高
- 检查maxEntries配置
- 确认LRU淘汰是否正常工作
- 查看是否有内存泄漏

#### 数据不一致
- 手动清除相关缓存
- 检查缓存键生成逻辑
- 确认TTL设置是否合理

### 调试命令
```javascript
// 查看详细缓存信息
cacheDebug()

// 验证缓存完整性
GitHubCacheManager.validateCacheIntegrity()

// 导出缓存数据用于分析
GitHubCacheManager.exportCacheData()

// 开始性能监控
const stopMonitoring = GitHubCacheManager.startPerformanceMonitoring()
```

## 未来优化方向

### 短期优化
- **智能预取**: 基于用户行为预测需要的数据
- **压缩存储**: 对大型数据进行压缩存储
- **持久化缓存**: 使用IndexedDB实现跨会话缓存

### 长期优化
- **分布式缓存**: 多标签页间共享缓存
- **增量更新**: 只获取变更的部分数据
- **机器学习**: 基于使用模式优化缓存策略

## 配置示例

### 开发环境配置
```typescript
applyCacheStrategy('conservative')
// 或者
saveCacheConfig({
  defaultTTL: 2 * 60 * 1000,  // 2分钟
  enableDebugLogs: true,
  maxEntries: 5
})
```

### 生产环境配置
```typescript
applyCacheStrategy('aggressive')
// 或者
saveCacheConfig({
  defaultTTL: 15 * 60 * 1000, // 15分钟
  enableDebugLogs: false,
  maxEntries: 20
})
```
