import { useState, useCallback, useRef } from "react"
import type { 
  SprintPlanningRequest, 
  SprintPlanningResponse,
  UseSprintPlanningReturn 
} from "~types/sprint-planning"
import { useSprintPlanningMessaging, useMessagingApi } from "~hook/use-api-messaging"

interface UseSprintPlanningOptions {
  enableStreaming?: boolean
  onStreamChunk?: (chunk: string, fullText: string) => void
  onStreamComplete?: (response: SprintPlanningResponse) => void
  onStreamError?: (error: string) => void
}

export function useSprintPlanning(options: UseSprintPlanningOptions = {}): UseSprintPlanningReturn {
  const { data, loading, error, execute, reset } = useSprintPlanningMessaging()
  const streamingTextRef = useRef<string>("")

  const analyze = useCallback(async (request: SprintPlanningRequest): Promise<void> => {
    try {
      streamingTextRef.current = ""

      // Determine if we should use streaming
      const useStreaming = options.enableStreaming && request.includeAIRecommendations
      const requestBody = {
        ...request,
        stream: useStreaming
      }

      console.log("🚀 Sprint Planning API request:", requestBody)

      // Use the standardized messaging API
      const result = await execute(requestBody, {
        onChunk: (chunk: string, fullText: string) => {
          streamingTextRef.current = fullText
          if (options.onStreamChunk) {
            options.onStreamChunk(chunk, fullText)
          }
        }
      })

      if (result && options.onStreamComplete) {
        options.onStreamComplete(result)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("❌ Sprint Planning API error:", err)
      
      if (options.onStreamError) {
        options.onStreamError(errorMessage)
      }
    }
  }, [execute, options])

  return {
    data,
    loading,
    error,
    analyze,
    reset
  }
}

// Additional hook for team workload analysis
export function useTeamWorkloadAnalysis() {
  const { data, loading, error, execute, reset } = useMessagingApi<any>("/sprint-planning/team-workload")

  const analyzeWorkload = useCallback(async (request: SprintPlanningRequest): Promise<void> => {
    try {
      console.log("🚀 Team Workload API request:", request)
      await execute(request)
    } catch (err) {
      console.error("❌ Team Workload API error:", err)
    }
  }, [execute])

  return {
    data,
    loading,
    error,
    analyzeWorkload,
    reset
  }
}

// Hook for board detection and sprint data
export function useBoardDetection() {
  const [boardId, setBoardId] = useState<string | null>(null)
  const [boardInfo, setBoardInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectBoard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Use the board detector service
      const { boardDetector } = await import("~services/board-detector")
      const detection = await boardDetector.detectBoard()
      
      if (detection.boardId) {
        setBoardId(detection.boardId)
        
        // Fetch board info from API using standard pattern
        const apiUrl = `http://localhost:8000/api/v1/sprint-planning/board-info/${detection.boardId}`
        const response = await fetch(apiUrl)
        
        if (response.ok) {
          const info = await response.json()
          setBoardInfo(info)
        }
      } else {
        throw new Error(detection.error || "Could not detect board ID")
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("❌ Board detection error:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshBoardInfo = useCallback(async (): Promise<void> => {
    if (!boardId) return
    
    try {
      setLoading(true)
      const apiUrl = `http://localhost:8000/api/v1/sprint-planning/board-info/${boardId}`
      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const info = await response.json()
        setBoardInfo(info)
      }
    } catch (err) {
      console.error("❌ Board info refresh error:", err)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  const reset = useCallback(() => {
    setBoardId(null)
    setBoardInfo(null)
    setLoading(false)
    setError(null)
  }, [])

  return {
    boardId,
    boardInfo,
    loading,
    error,
    detectBoard,
    refreshBoardInfo,
    reset
  }
}
