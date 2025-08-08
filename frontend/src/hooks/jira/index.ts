// 🎯 AI Toolbox Jira 专用Hook
// 简化架构 - 基于通用Hook的Jira功能封装

import { useStreamBase, type StreamOptions } from '../common/useStreamBase'

/**
 * 🚀 Jira Ticket Summary Hook
 * 生成Jira工单的智能摘要
 */
export const useJiraTicketSummary = () => useStreamBase('jira', 'ticket-summary')

/**
 * 🚀 Jira Message Optimize Hook  
 * 优化Jira消息内容
 */
export const useJiraMessageOptimize = () => useStreamBase('jira', 'message-optimize')

/**
 * 🚀 Jira Status Check Hook
 * 检查Jira工单状态
 */
export const useJiraStatusCheck = () => useStreamBase('jira', 'status-check')

/**
 * 🔧 带验证的Jira Ticket Summary Hook
 * 添加了请求参数验证，确保数据完整性
 */
export function useJiraTicketSummaryWithValidation() {
  const hook = useJiraTicketSummary()
  
  const executeWithValidation = async (
    request: { issue_key: string; [key: string]: any }, 
    options?: StreamOptions
  ) => {
    // 简单但有效的验证
    if (!request?.issue_key) {
      throw new Error('issue_key is required for ticket summary generation')
    }
    
    if (typeof request.issue_key !== 'string' || request.issue_key.trim() === '') {
      throw new Error('issue_key must be a non-empty string')
    }
    
    return hook.execute(request, options)
  }
  
  return {
    ...hook,
    execute: executeWithValidation
  }
}

/**
 * 🔧 带验证的Jira Message Optimize Hook
 * 添加了消息内容验证
 */
export function useJiraMessageOptimizeWithValidation() {
  const hook = useJiraMessageOptimize()
  
  const executeWithValidation = async (
    request: { issue_key: string; message_to_optimize: string; [key: string]: any },
    options?: StreamOptions  
  ) => {
    // 验证issue_key
    if (!request?.issue_key) {
      throw new Error('issue_key is required for message optimization')
    }
    
    if (typeof request.issue_key !== 'string' || request.issue_key.trim() === '') {
      throw new Error('issue_key must be a non-empty string')
    }
    
    // 验证消息内容
    if (!request?.message_to_optimize) {
      throw new Error('message_to_optimize is required for message optimization')
    }
    
    if (typeof request.message_to_optimize !== 'string' || request.message_to_optimize.trim() === '') {
      throw new Error('message_to_optimize must be a non-empty string')
    }
    
    if (request.message_to_optimize.length > 10000) {
      throw new Error('message_to_optimize is too long (max 10000 characters)')
    }
    
    return hook.execute(request, options)
  }
  
  return {
    ...hook,
    execute: executeWithValidation
  }
}

/**
 * 🔧 Jira Hook工厂函数
 * 用于创建自定义的Jira Hook（未来扩展使用）
 */
export function createJiraHook(action: string) {
  return () => useStreamBase('jira', action)
}

// 类型导出 - 方便其他文件使用
export type JiraTicketSummaryHook = ReturnType<typeof useJiraTicketSummary>
export type JiraMessageOptimizeHook = ReturnType<typeof useJiraMessageOptimize>  
export type JiraStatusCheckHook = ReturnType<typeof useJiraStatusCheck>