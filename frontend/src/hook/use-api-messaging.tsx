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
  // Robustly join URL parts, avoiding double slashes.
  const joinedPath = [API_VERSION, endpoint]
    .join("/")
    .replace(/\/+/g, "/")
  return `${API_BASE_URL}${joinedPath}`
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
          // 在返回前确保内容格式正确
          const formattedContent = formatGeneratedContent(fullContent)
          return formattedContent
        }

        // 保持原始格式，不要丢失换行符
        fullContent += data

        // 调用onChunk回调，传递格式化后的内容
        if (onChunk) {
          const formattedChunk = formatGeneratedContent(fullContent)
          onChunk(data, formattedChunk)
        }
      }
    }
  }

  // 确保最终内容格式正确
  const formattedContent = formatGeneratedContent(fullContent)
  return formattedContent
}

// 格式化生成的内容，确保正确的换行和段落分隔
function formatGeneratedContent(content: string): string {
  if (!content) return content

  // 移除多余的空白字符，但保留必要的换行
  let formatted = content.trim()

  // 确保段落标题（独立行的粗体文本）之间有适当的间距
  // 只在粗体文本是独立行且后面跟着非空行时添加换行
  formatted = formatted.replace(/^(\*\*[^*]+\*\*)\s*$/gm, '$1\n')

  // 确保列表项之间有适当的间距
  formatted = formatted.replace(/^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)/gm, '$1\n$2')

  // 确保句子结束后的段落标题有适当的间距
  formatted = formatted.replace(/([.!?])\s*\n(\*\*[^*]+\*\*)/g, '$1\n\n$2')

  // 清理多余的连续换行符（超过2个的）
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  return formatted
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
  return useMessagingApi("/ai/github/pr")
}

// New hook for generating PR description from Jira - specialized for JSON response with streaming support
export function useGitHubPRFromJiraMessaging() {
  const [state, setState] = useState<UseMessagingApiState<any>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (
    body: any,
    options: { onChunk?: (chunk: string, fullText: string) => void } = {}
  ): Promise<any | null> => {
    const { onChunk } = options
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log(`🚀 GitHub PR from Jira API调用:`, body)
      console.log(`🚀 API调用时间戳:`, new Date().toISOString())

      // Force streaming if onChunk callback is provided
      const requestBody = onChunk ? { ...body, stream: true } : body

      const response = await fetch(getApiUrl("/ai/github/pr-from-jira"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`📡 API响应状态:`, response.status)
      console.log(`📡 API响应头:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API错误:`, errorText)

        // Provide more specific error messages based on status code
        let errorMessage = `API调用失败: ${response.status}`
        switch (response.status) {
          case 401:
            errorMessage = "认证失败 - 请检查GitHub token或重新登录"
            break
          case 403:
            errorMessage = "访问被拒绝 - 权限不足或速率限制"
            break
          case 404:
            errorMessage = "资源未找到 - 可能是私有仓库或PR不存在"
            break
          case 500:
            errorMessage = "服务器错误 - 请稍后重试"
            break
          case 0:
          case undefined:
            errorMessage = "网络连接失败 - 请检查网络连接和后端服务状态"
            break
          default:
            errorMessage = `API调用失败: ${response.status} - ${errorText}`
        }

        throw new Error(errorMessage)
      }

      // Check content type to determine how to parse response
      const contentType = response.headers.get('content-type')
      console.log(`📡 Content-Type:`, contentType)

      let result
      if (onChunk && contentType?.includes('text/plain')) {
        // Handle streaming response with callback
        console.log("📡 Processing streaming response with callback...")
        const streamContent = await handleStreamingResponse(response, onChunk)
        console.log(`✅ 流式响应完成:`, streamContent.slice(0, 100) + "...")
        result = { generated_content: streamContent }
      } else if (contentType?.includes('application/json')) {
        // Handle JSON response
        result = await response.json()
        console.log(`✅ JSON响应:`, result)
      } else if (contentType?.includes('text/plain')) {
        // Handle streaming response without callback
        const streamContent = await handleStreamingResponse(response)
        console.log(`✅ 流式响应完成:`, streamContent.slice(0, 100) + "...")
        result = { generated_content: streamContent }
      } else {
        // Fallback: try JSON first, then text
        try {
          result = await response.json()
          console.log(`✅ Fallback JSON响应:`, result)
        } catch {
          const text = await response.text()
          console.log(`✅ Fallback text响应:`, text.slice(0, 100) + "...")
          result = { generated_content: text }
        }
      }

      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "API调用错误"
      console.error(`❌ API调用失败:`, error)
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

// Jira Definition of Done generation hook - direct API call
export function useJiraDoDefinitionMessaging() {
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

// Sprint Planning API hook - specialized for complex response handling
export function useSprintPlanningMessaging() {
  const [state, setState] = useState<UseMessagingApiState<any>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (
    body: any, 
    options: { onChunk?: (chunk: string, fullText: string) => void } = {}
  ): Promise<any | null> => {
    const { onChunk } = options
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      console.log(`🚀 Sprint Planning API调用:`, body)
      
      const response = await fetch(getApiUrl("/sprint-planning/analyze"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      console.log(`📡 Sprint Planning API响应状态:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Sprint Planning API错误:`, errorText)
        throw new Error(`API调用失败: ${response.status} - ${errorText}`)
      }

      // Check if response is streaming or JSON
      const contentType = response.headers.get('content-type')
      
      if (body.stream && contentType?.includes('text/plain')) {
        // Handle streaming response
        const streamContent = await handleStreamingResponse(response, onChunk)
        console.log(`✅ Sprint Planning 流式响应完成`)
        
        // Construct Sprint Planning response structure
        const result = {
          analysisResult: {
            boardId: body.boardId,
            sprintSummary: {
              sprintName: body.sprintData?.sprint?.name || "Current Sprint",
              sprintState: body.sprintData?.sprint?.state || "active", 
              issueCount: body.sprintData?.issues?.length || 0,
              startDate: body.sprintData?.sprint?.startDate,
              endDate: body.sprintData?.sprint?.endDate
            },
            analysisTimestamp: new Date().toISOString()
          },
          aiRecommendations: streamContent.split('\n').filter(Boolean).map((text, index) => ({
            id: `rec-${index}`,
            type: 'optimization' as const,
            priority: 'medium' as const,
            title: `Recommendation ${index + 1}`,
            description: text,
            actionable: true
          })),
          teamWorkload: {
            memberWorkloads: {},
            unassignedPoints: 0,
            totalAssignedPoints: body.sprintData?.totalStoryPoints || 0
          },
          metrics: {
            totalStoryPoints: body.sprintData?.totalStoryPoints || 0,
            teamVelocity: [35, 42, 38, 40, 36],
            avgVelocity: 38.2,
            utilizationRate: 105,
            teamSize: body.teamMembers?.length || 0
          },
          model: "gpt-4",
          tokensUsed: Math.floor(streamContent.length / 4),
          success: true
        }
        
        setState({ data: result, loading: false, error: null })
        return result
      } else {
        // Handle regular JSON response
        const result = await response.json()
        console.log(`✅ Sprint Planning JSON响应:`, result)
        
        setState({ data: result, loading: false, error: null })
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sprint Planning API调用错误"
      console.error(`❌ Sprint Planning API调用失败:`, error)
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