import React, { useEffect, useState } from "react"
import { useNotification } from "~components/common/notification"
import { useGitHubPRFromJiraMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import { useGitHubDOM } from "../../hooks/useGitHubDOM"
import styles from "./add-description.module.css"

export const AddDescription = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useGitHubPRFromJiraMessaging()
  const githubDOM = useGitHubDOM()
  const [originalContent, setOriginalContent] = useState<string>("")
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")

  // Store original content before generation
  const storeOriginalContent = () => {
    const strategy = getGitHubPageStrategy()
    const existingContent = strategy.getDescriptionTemplate()
    setOriginalContent(existingContent)
  }

  // Revert to original content
  const revertToOriginal = async () => {
    if (!originalContent && !hasGeneratedContent) return

    try {
      const strategy = getGitHubPageStrategy()
      const activeTextarea = strategy.findEditModeTextarea()

      if (activeTextarea) {
        await githubDOM.fillTextarea(activeTextarea, originalContent)
      } else {
        await githubDOM.setCommentArea(originalContent)
      }

      setHasGeneratedContent(false)
      setStreamingContent("")

      // No notification needed - user can see the content change directly
    } catch (error) {
      console.error("Error reverting content:", error)
      addNotification({
        type: "error",
        title: "Revert Failed",
        message: "Failed to revert content. Please manually restore if needed.",
        time: 5000 // Longer duration for errors
      })
    }
  }

  // Monitor error changes and show notifications
  useEffect(() => {
    if (error && !loading) {
      addNotification({
        type: "error",
        title: "Generation Failed",
        message: error,
        time: 5000 // Longer duration for errors
      })
    }
  }, [error, loading, addNotification])

  // Manage revert button in GitHub edit interface
  useEffect(() => {
    if (hasGeneratedContent && !loading) {
      // Insert revert button when content has been generated and not loading
      const inserted = githubDOM.insertRevertButton(revertToOriginal)
      if (!inserted) {
        console.warn("Failed to insert revert button")
      }
    } else {
      // Remove revert button when no generated content or loading
      githubDOM.removeRevertButton()
    }

    // Cleanup on unmount
    return () => {
      githubDOM.removeRevertButton()
    }
  }, [hasGeneratedContent, loading, githubDOM, revertToOriginal])

  // Function to immediately activate edit mode before API call
  const activateEditModeImmediately = async (): Promise<boolean> => {
    return await githubDOM.activateEditModeImmediately()
  }

  // Function to check API connectivity
  const checkAPIConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/health", {
        method: "GET",
        timeout: 5000
      } as any)
      return response.ok
    } catch (error) {
      console.error("API connectivity check failed:", error)
      return false
    }
  }

  const handleClick = async () => {
    if (loading) return

    // Check API connectivity first
    const isAPIConnected = await checkAPIConnectivity()
    if (!isAPIConnected) {
      addNotification({
        type: "error",
        title: "Connection Failed",
        message: "Unable to connect to backend service. Please ensure the backend service is running on localhost:8000.",
        time: 6000 // Longer duration for connection errors
      })
      return
    }

    const strategy = getGitHubPageStrategy()

    // Store original content before generation
    storeOriginalContent()

    // Get PR title
    const prTitle = strategy.getPRTitle()
    if (!prTitle) {
      addNotification({
        type: "warning",
        title: "Missing Title",
        message: "Could not detect a Pull Request title on the page.",
        time: 4000 // Moderate duration for warnings
      })
      return
    }

    // Activate edit mode before API call
    const editModeActivated = await activateEditModeImmediately()
    if (!editModeActivated) {
      addNotification({
        type: "warning",
        title: "Edit Mode Failed",
        message: "Could not activate edit mode. Continuing with fallback method.",
        time: 4000 // Moderate duration for warnings
      })
    }

    // Get Jira ticket
    let jiraTicketId = strategy.extractJiraTicketId()
    if (!jiraTicketId) {
      jiraTicketId = window.prompt(
        "Could not automatically detect a Jira ticket ID. Please enter one (e.g., PROJ-123):"
      )
      if (!jiraTicketId) {
        addNotification({
          type: "warning",
          title: "Cancelled",
          message: "Jira ticket ID is required for generation.",
          time: 4000 // Moderate duration for warnings
        })
        return
      }
    }

    // Get code changes, branch name, and commit messages
    const codeChanges = await strategy.getCodeChanges()
    const branchName = strategy.getBranchName()
    const commitMessages = await strategy.getCommitMessages()
    const descriptionTemplate = strategy.getDescriptionTemplate()

    if (!codeChanges) {
      addNotification({
        type: "warning",
        title: "No Changes Found",
        message: "Could not detect any code changes on the page.",
        time: 4000 // Moderate duration for warnings
      })
    }

    await handleGenerate({
      jira_ticket_id: jiraTicketId,
      pr_title: prTitle,
      code_changes: codeChanges,
      branch_name: branchName,
      commit_messages: commitMessages,
      description_template: descriptionTemplate,
    })
  }

  const handleGenerate = async (payload: {
    jira_ticket_id: string
    pr_title: string
    code_changes: string
    branch_name: string
    commit_messages: string[]
    description_template: string
  }) => {
    if (loading) return

    // Clear previous streaming content
    setStreamingContent("")

    // No notification needed - user will see real-time generation in textarea

    try {
      // Check if edit mode is already active
      const strategy = getGitHubPageStrategy()
      const activeTextarea = strategy.findEditModeTextarea()
      let result: any = null

      if (activeTextarea) {
        // Execute with streaming callback to update textarea in real-time
        result = await execute(payload, {
          onChunk: (_chunk: string, fullText: string) => {
            console.log("Received streaming content _chunk:", _chunk)
            console.log("Received streaming content fullText:", fullText)
            setStreamingContent(fullText)
            githubDOM.updateTextareaRealtime(activeTextarea, fullText)
          }
        })
      } else {
        // Standard mode with streaming to state
        result = await execute(payload, {
          onChunk: (_chunk: string, fullText: string) => {
            setStreamingContent(fullText)
          }
        })
      }

      // Extract description and title from result
      let description = streamingContent || null
      let suggestedTitle = null

      if (result) {
        // Try different response formats
        if (result.generated_description) {
          description = result.generated_description
          suggestedTitle = result.suggested_title
        } else if (result.generated_content) {
          description = result.generated_content
          suggestedTitle = result.suggested_title
        } else if (typeof result === 'string') {
          description = result
        } else if (result.text) {
          description = result.text
          suggestedTitle = result.suggested_title
        } else {
          // Check for alternative text properties
          const textProperties = ['content', 'message', 'response', 'data']
          for (const prop of textProperties) {
            if (result[prop] && typeof result[prop] === 'string') {
              description = result[prop]
              break
            }
          }
        }
      }

      if (description && description.trim()) {
        // Mark that content has been generated
        setHasGeneratedContent(true)

        // If edit mode is already active, content is already filled via streaming
        // Otherwise, use normal flow
        if (!activeTextarea) {
          const result = await githubDOM.setCommentArea(description)
          if (!result.success) {
            console.error("Failed to set comment area:", result.error)
          }
        }

        if (suggestedTitle) {
          addNotification({
            type: "info",
            title: "Suggested Title",
            message: `AI suggests a better title: "${suggestedTitle}"`,
            time: 4000 // Moderate duration for info
          })
        }

        // No success notification needed - user can see the generated content directly
      } else {
        console.error("Generation failed, no valid description found")
        addNotification({
          type: "error",
          title: "Generation Failed",
          message: "Failed to generate description content. Please try again.",
          time: 5000
        })
      }
    } catch (error) {
      console.error("Generation error:", error)
      // Error handling is now centralized in the API hook
      // The hook will set the error state which triggers the useEffect above
    }
  }



  const LoadingSpinner = () => (
    <svg className={styles.spinner} viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2.046 8A5.954 5.954 0 018 2.046v.033a.75.75 0 010 1.434V4.5a3.5 3.5 0 106.954 0V3.516a.75.75 0 110-1.434v-.033A5.954 5.954 0 0113.954 8h-.033a.75.75 0 01-1.434 0H12.5a3.5 3.5 0 100 6.954h.016a.75.75 0 111.434 0h.033A5.954 5.954 0 018 13.954v.033a.75.75 0 010-1.434V12.5a3.5 3.5 0 10-6.954 0v.016a.75.75 0 11-1.434 0v.033A5.954 5.954 0 012.046 8z"
      />
    </svg>
  )

  return (
    <div
      className="dropdown-item"
      onClick={handleClick}
      style={{
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1
      }}
      title="Generate PR description from a Jira ticket and code changes">
      {loading ? (
        <>
          <LoadingSpinner />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <SparklesIcon className={styles.icon} />
          <span>Generate</span>
        </>
      )}
    </div>
  )
}
