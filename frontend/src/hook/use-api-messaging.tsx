import { useCallback, useState } from "react"
import { getApiConfigSync } from "../../lib/config/api-config"
export interface UseMessagingApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseMessagingApiReturn<T> extends UseMessagingApiState<T> {
  execute: (body: any, options?: { onChunk?: (chunk: string, fullText: string) => void }) => Promise<T | null>
  reset: () => void
}

const apiConfig = getApiConfigSync()
// API configuration
const API_BASE_URL = apiConfig.baseUrl
const API_VERSION = "/api/v1"

// Build the complete API URL
function getApiUrl(endpoint: string): string {
  // Robustly join URL parts, avoiding double slashes.
  const joinedPath = [API_VERSION, endpoint]
    .join("/")
    .replace(/\/+/g, "/")
  return `${API_BASE_URL}${joinedPath}`
}

// Enhanced error handling for API responses
function createAPIError(response: Response, errorText: string): Error {
  const status = response.status
  const statusText = response.statusText

  // Create specific error messages based on status codes
  if (status === 401) {
    return new Error("Authentication failed. Please check your credentials.")
  } else if (status === 403) {
    return new Error("Access denied. This may be a private repository or insufficient permissions.")
  } else if (status === 404) {
    return new Error("Resource not found. Please check your input.")
  } else if (status === 429) {
    return new Error("Rate limit exceeded. Please try again later.")
  } else if (status >= 500) {
    return new Error("Server error. Please try again later.")
  } else if (status >= 400) {
    return new Error(`Client error (${status}): ${errorText || statusText}`)
  } else {
    return new Error(`API call failed (${status}): ${errorText || statusText}`)
  }
}

// Handle streaming response - general version (keep smart spacing logic, for other tools)
async function handleStreamingResponse(response: Response, onChunk?: (chunk: string, fullText: string) => void): Promise<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  if (!reader) {
    throw new Error('Cannot get response stream')
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
          return formatGeneratedContent(fullContent)
        }

        // Decode the line feed and keep the original format
        // Handle both encoded \\n and raw newlines
        let decodedData = data
        if (data.includes('\\n')) {
          decodedData = data.replace(/\\n/g, '\n')
        }

        // Smart spacing: add space between chunks if needed
        if (decodedData && fullContent && 
            !fullContent.endsWith(' ') && !fullContent.endsWith('\n') &&
            !decodedData.startsWith(' ') && !decodedData.startsWith('\n')) {
          fullContent += ' '
        }

        // Always append the data, even if it's empty (could be newlines)
        fullContent += decodedData

        // Call the onChunk callback, passing the formatted content
        if (onChunk) {
          const formattedChunk = formatGeneratedContent(fullContent)
          onChunk(decodedData, formattedChunk)
        }
      }
    }
  }

  // Ensure the final content format is correct
  return formatGeneratedContent(fullContent)
}

// Specialized streaming response handling for GitHub PR (no smart spacing logic)
async function handleGitHubPRStreamingResponse(response: Response, onChunk?: (chunk: string, fullText: string) => void): Promise<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  if (!reader) {
    throw new Error('Cannot get response stream')
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
          return formatGeneratedContent(fullContent)
        }

        // Decode the line feed and keep the original format
        // Handle both encoded \\n and raw newlines
        let decodedData = data
        if (data.includes('\\n')) {
          decodedData = data.replace(/\\n/g, '\n')
        }

        // Directly concatenate the chunk, without adding smart spacing, keeping the original format of AI generated content
        fullContent += decodedData

        // Call the onChunk callback, passing the formatted content
        if (onChunk) {
          const formattedChunk = formatGeneratedContent(fullContent)
          onChunk(decodedData, formattedChunk)
        }
      }
    }
  }

  // Ensure the final content format is correct
  return formatGeneratedContent(fullContent)
}

// Format the generated content, ensuring correct line breaks and paragraph separation
function formatGeneratedContent(content: string): string {
  if (!content) return content

  // Remove extra whitespace, but preserve necessary line breaks
  let formatted = content.trim()

  // Ensure spacing between paragraph titles (bold text on separate lines)
  // Only add line breaks when the bold text is on a separate line and followed by a non-empty line
  formatted = formatted.replace(/^(\*\*[^*]+\*\*)\s*$/gm, '$1\n')

  // Ensure spacing between list items
  formatted = formatted.replace(/^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)/gm, '$1\n$2')

  // Ensure spacing after paragraph titles (bold text on separate lines)
  formatted = formatted.replace(/([.!?])\s*\n(\*\*[^*]+\*\*)/g, '$1\n\n$2')

  // Clean up excessive consecutive line breaks (more than 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  return formatted
}

// Generic API hook - directly call the backend API
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
      const requestBody = { ...body, stream: true }
      
      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", errorText)
        throw new Error(`API call failed: ${response.status} - ${errorText}`)
      }

      const streamContent = await handleStreamingResponse(response, onChunk)
      const result = { generated_content: streamContent } as T
      
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "API call error"
      console.error("API call failed:", error)
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

// GitHub PR generation hook - direct API call
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
      const requestBody = onChunk ? { ...body, stream: true } : body

      const response = await fetch(getApiUrl("/ai/github/pr-from-jira"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", errorText)

        let errorMessage = `API call failed: ${response.status}`
        switch (response.status) {
          case 401:
            errorMessage = "Authentication failed - please check GitHub token or re-login"
            break
          case 403:
            errorMessage = "Access denied - insufficient permissions or rate limit"
            break
          case 404:
            errorMessage = "Resource not found - may be a private repository or PR does not exist"
            break
          case 500:
            errorMessage = "Server error - please try again later"
            break
          case 0:
          case undefined:
            errorMessage = "Network connection failed - please check network connection and backend service status"
            break
          default:
            errorMessage = `API call failed: ${response.status} - ${errorText}`
        }

        throw new Error(errorMessage)
      }

      const contentType = response.headers.get('content-type')
      const isStreamingRequested = requestBody.stream === true

      let result
      if (isStreamingRequested && onChunk) {
        const streamContent = await handleGitHubPRStreamingResponse(response, onChunk)
        result = { generated_content: streamContent }
              } else if (isStreamingRequested) {
          const streamContent = await handleGitHubPRStreamingResponse(response)
          result = { generated_content: streamContent }
      } else if (contentType?.includes('application/json')) {
        result = await response.json()
      } else {
        try {
          result = await response.json()
        } catch {
          const text = await response.text()
          result = { generated_content: text }
        }
      }

      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "API call error"
      console.error("API call failed:", error)
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

// Jira Ticket Summary generation hook - direct API call
export function useJiraTicketSummaryMessaging() {
  return useMessagingApi("/ai/jira/summary")
}

// Message Optimize hook - direct API call
export function messageOptimizeMessaging() {
  return useMessagingApi("/ai/jira/optimize")
}

// Health check hook - direct API call
export function useHealthCheckMessaging() {
  const [state, setState] = useState<UseMessagingApiState<any>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (): Promise<any> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await fetch(getApiUrl("/ai/health"))
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const result = await response.json()
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Health check error"
      console.error("Health check failed:", error)
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
      const response = await fetch(getApiUrl("/sprint-planning/analyze"), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Sprint Planning API Error:", errorText)
        throw new Error(`API call failed: ${response.status} - ${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      
      if (body.stream && contentType?.includes('text/plain')) {
        const streamContent = await handleStreamingResponse(response, onChunk)
        
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
        const result = await response.json()
        setState({ data: result, loading: false, error: null })
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sprint Planning API call error"
      console.error("Sprint Planning API call failed:", error)
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