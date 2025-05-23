import { useCallback, useState } from "react"
import { sendToBackground } from "@plasmohq/messaging"

export interface UseMessagingApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseMessagingApiReturn<T> extends UseMessagingApiState<T> {
  execute: (body: any) => Promise<T | null>
  reset: () => void
}

// 通用Messaging API hook
export function useMessagingApi<T = any>(
  messageName: string
): UseMessagingApiReturn<T> {
  const [state, setState] = useState<UseMessagingApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (body: any): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log(`🚀 发送消息到背景脚本: ${messageName}`, body)
      
      const response: any = await sendToBackground({
        name: messageName,
        body
      })

      console.log(`📡 收到背景脚本响应:`, response)

      if (response?.success) {
        setState({ data: response.data, loading: false, error: null })
        return response.data
      } else {
        const errorMessage = response?.error || "未知错误"
        setState({ data: null, loading: false, error: errorMessage })
        return null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "通信错误"
      console.error(`❌ 消息发送失败:`, error)
      setState({ data: null, loading: false, error: errorMessage })
      return null
    }
  }, [messageName])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

// GitHub PR 生成 hook (使用Messaging)
export function useGitHubPRMessaging() {
  return useMessagingApi("github-pr")
}

// Jira 评论生成 hook (使用Messaging)
export function useJiraCommentMessaging() {
  return useMessagingApi("jira-comment")
}

// 健康检查 hook (使用Messaging)
export function useHealthCheckMessaging() {
  return useMessagingApi("health-check")
} 