import { useCallback, useState } from "react"

export interface UseMessagingApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseMessagingApiReturn<T> extends UseMessagingApiState<T> {
  execute: (body: any, options?: { onChunk?: (chunk: string, fullText: string) => void }) => Promise<T | null>
  reset: () => void
}

// API配置
const API_BASE_URL = "http://localhost:8000"
const API_VERSION = "/api/v1"

// 构建完整API URL
function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`
}

// 处理流式响应
async function handleStreamingResponse(response: Response, onChunk?: (chunk: string, fullText: string) => void): Promise<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  
  if (!reader) {
    throw new Error('无法获取响应流')
  }
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          return fullContent
        }
        fullContent += data
        
        // 调用onChunk回调
        if (onChunk) {
          onChunk(data, fullContent)
        }
      }
    }
  }
  
  return fullContent
}

// 通用API hook - 直接调用后端API
export function useMessagingApi<T = any>(
  endpoint: string
): UseMessagingApiReturn<T> {
  const [state, setState] = useState<UseMessagingApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (
    body: any, 
    options: { onChunk?: (chunk: string, fullText: string) => void } = {}
  ): Promise<T | null> => {
    const { onChunk } = options
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log(`🚀 直接调用API: ${endpoint}`, body)
      console.log(`🚀 API调用时间戳:`, new Date().toISOString())
      
      const requestBody = { ...body, stream: true }
      
      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`📡 API响应状态:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API错误:`, errorText)
        throw new Error(`API调用失败: ${response.status} - ${errorText}`)
      }

      // 处理流式响应
      const streamContent = await handleStreamingResponse(response, onChunk)
      console.log(`✅ 流式响应完成:`, streamContent.slice(0, 100) + "...")
      
      const result = { generated_content: streamContent } as T
      
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "API调用错误"
      console.error(`❌ API调用失败:`, error)
      setState({ data: null, loading: false, error: errorMessage })
      return null
    }
  }, [endpoint])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

// GitHub PR 生成 hook - 直接API调用
export function useGitHubPRMessaging() {
  return useMessagingApi("/ai/github/generate")
}

// Jira 评论生成 hook - 直接API调用  
export function useJiraCommentMessaging() {
  return useMessagingApi("/ai/jira/generate")
}

// 健康检查 hook - 直接API调用
export function useHealthCheckMessaging() {
  const [state, setState] = useState<UseMessagingApiState<any>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (): Promise<any> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log(`🚀 健康检查API调用`)
      
      const response = await fetch(getApiUrl("/ai/health"))
      
      console.log(`📡 健康检查响应状态:`, response.status)
      
      if (!response.ok) {
        throw new Error(`健康检查失败: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`✅ 健康检查成功:`, result)
      
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "健康检查错误"
      console.error(`❌ 健康检查失败:`, error)
      setState({ data: null, loading: false, error: errorMessage })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
} 