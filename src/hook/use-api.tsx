import { useCallback, useState } from "react"
import { apiClient } from "../../lib/servers/api-config"
import type { GitHubPRResponse, JiraCommentResponse } from "../../lib/servers/api-config"

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>
  reset: () => void
}

// 通用API hook
export function useApi<T>(
  apiCall: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await apiCall(...args)
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return null
    }
  }, [apiCall])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

// GitHub PR 生成 hook
export function useGitHubPR() {
  return useApi<GitHubPRResponse>(apiClient.generateGitHubPR.bind(apiClient))
}

// Jira 评论生成 hook
export function useJiraComment() {
  return useApi<JiraCommentResponse>(apiClient.generateJiraComment.bind(apiClient))
}

// 健康检查 hook
export function useHealthCheck() {
  return useApi(apiClient.checkHealth.bind(apiClient))
} 