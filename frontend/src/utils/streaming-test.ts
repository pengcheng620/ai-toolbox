/**
 * Streaming functionality test utility
 * Use this to debug and verify streaming output functionality
 */

import { useGitHubPRFromJiraMessaging } from "../hook/use-api-messaging"

export interface StreamingTestResult {
  success: boolean
  error?: string
  chunks: string[]
  fullContent: string
  duration: number
}

export class StreamingTester {
  private chunks: string[] = []
  private startTime: number = 0

  /**
   * Test streaming functionality with a simple payload
   */
  async testStreaming(): Promise<StreamingTestResult> {
    this.chunks = []
    this.startTime = Date.now()

    try {
      console.log("🧪 Starting streaming test...")

      // Create a test payload
      const testPayload = {
        jira_ticket_id: "TEST-123",
        pr_title: "Test PR for streaming functionality",
        code_changes: "console.log('test change')",
        branch_name: "test-branch",
        commit_messages: ["Test commit"],
        description_template: ""
      }

      // Test the hook directly
      const { execute } = useGitHubPRFromJiraMessaging()

      const result = await execute(testPayload, {
        onChunk: (chunk: string, fullText: string) => {
          console.log("🧪 Test received chunk:", chunk.slice(0, 50) + "...")
          console.log("🧪 Test full text length:", fullText.length)
          this.chunks.push(chunk)
        }
      })

      const duration = Date.now() - this.startTime

      console.log("🧪 Streaming test completed")
      console.log("🧪 Total chunks received:", this.chunks.length)
      console.log("🧪 Duration:", duration + "ms")

      return {
        success: true,
        chunks: this.chunks,
        fullContent: result?.generated_content || "",
        duration
      }

    } catch (error) {
      const duration = Date.now() - this.startTime
      console.error("🧪 Streaming test failed:", error)

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        chunks: this.chunks,
        fullContent: "",
        duration
      }
    }
  }

  /**
   * Test streaming with manual fetch to isolate issues
   */
  async testManualStreaming(): Promise<StreamingTestResult> {
    this.chunks = []
    this.startTime = Date.now()

    try {
      console.log("🧪 Starting manual streaming test...")

      const testPayload = {
        jira_ticket_id: "TEST-123",
        pr_title: "Test PR for streaming functionality",
        code_changes: "console.log('test change')",
        branch_name: "test-branch",
        commit_messages: ["Test commit"],
        description_template: "",
        stream: true
      }

      const response = await fetch("http://localhost:8000/api/v1/ai/github/pr-from-jira", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      console.log("🧪 Response status:", response.status)
      console.log("🧪 Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      // Manual streaming processing
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      if (!reader) {
        throw new Error("No response body reader available")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        console.log("🧪 Raw chunk:", chunk)

        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              console.log("🧪 Received [DONE] marker")
              break
            }
            fullContent += data
            this.chunks.push(data)
            console.log("🧪 Processed data:", data.slice(0, 50) + "...")
          }
        }
      }

      const duration = Date.now() - this.startTime

      console.log("🧪 Manual streaming test completed")
      console.log("🧪 Total chunks:", this.chunks.length)
      console.log("🧪 Full content length:", fullContent.length)

      return {
        success: true,
        chunks: this.chunks,
        fullContent,
        duration
      }

    } catch (error) {
      const duration = Date.now() - this.startTime
      console.error("🧪 Manual streaming test failed:", error)

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        chunks: this.chunks,
        fullContent: "",
        duration
      }
    }
  }

  /**
   * Run comprehensive streaming tests
   */
  async runAllTests(): Promise<{
    hookTest: StreamingTestResult
    manualTest: StreamingTestResult
  }> {
    console.log("🧪 Running comprehensive streaming tests...")

    const hookTest = await this.testStreaming()
    const manualTest = await this.testManualStreaming()

    console.log("🧪 Test Results Summary:")
    console.log("🧪 Hook test success:", hookTest.success)
    console.log("🧪 Manual test success:", manualTest.success)

    if (!hookTest.success) {
      console.error("🧪 Hook test error:", hookTest.error)
    }

    if (!manualTest.success) {
      console.error("🧪 Manual test error:", manualTest.error)
    }

    return { hookTest, manualTest }
  }
}

// Export singleton instance for easy testing
export const streamingTester = new StreamingTester()

// Global function for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testStreaming = () => streamingTester.runAllTests()
}
