import React, { useEffect, useState } from "react"
import { useNotification } from "~components/common/notification"
import { useGitHubPRFromJiraMessaging } from "~hook/use-api-messaging"

import {
  fetchPRCommitMessages,
  fetchPRFileChanges,
  type ParsedFile,
  type ParsedCommit
} from "../../services/github-pr-page-service"
import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import { useGitHubDOM } from "../../hooks/useGitHubDOM"
import styles from "./add-description.module.css"
import { getApiConfigSync } from "../../../lib/config/api-config"

export const AddDescription = () => {
  const { showError, showWarning } = useNotification()
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
      showError("Revert Failed", "Failed to revert content. Please manually restore if needed.")
    }
  }

  // Monitor error changes and show notifications
  useEffect(() => {
    if (error && !loading) {
      showError("Generation Failed", error)
    }
  }, [error, loading, showError])

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

  const apiConfig = getApiConfigSync()
  // Function to check API connectivity
  const checkAPIConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch(apiConfig.endpoints.ai.health, {
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
      showError("Connection Failed", "Unable to connect to backend service. Please ensure the backend service is running on localhost:8000.")
      return
    }

    const strategy = getGitHubPageStrategy()

    // Store original content before generation
    storeOriginalContent()

    // Get PR title
    const prTitle = strategy.getPRTitle()
    if (!prTitle) {
      showWarning("Missing Title", "Could not detect a Pull Request title on the page.")
      return
    }

    // Activate edit mode before API call
    await activateEditModeImmediately()
    // Edit mode failure is handled gracefully with fallback - no notification needed

    // Get Jira ticket
    let jiraTicketId = strategy.extractJiraTicketId()
    if (!jiraTicketId) {
      jiraTicketId = window.prompt(
        "Could not automatically detect a Jira ticket ID. Please enter one (e.g., PROJ-123):"
      )
      if (!jiraTicketId) {
        // User cancelled - no notification needed, this is intentional
        return
      }
    }

    // Get code changes, branch name, and commit messages
    const codeChanges = await strategy.getCodeChanges()
    const branchName = strategy.getBranchName()
    const commitMessages = await strategy.getCommitMessages()
    const descriptionTemplate = strategy.getDescriptionTemplate()

    // Remove warning for no changes - this is optional data and generation can proceed

    // Fetch enhanced data structures silently
    console.log("🔍 Fetching enhanced PR data...")
    let filesChanged = null
    let commits = null

    // Fetch file changes silently - no notifications for optional data
    try {
      console.log("📁 Fetching detailed file changes...")
      filesChanged = await fetchPRFileChanges()
      console.log(`✅ Fetched ${filesChanged.length} file changes`)
    } catch (error) {
      console.warn("⚠️ Failed to fetch file changes:", error)
      // Continue without file changes - this is optional data, no notification needed
    }

    // Fetch commit information silently - no notifications for optional data
    try {
      console.log("📝 Fetching detailed commit information...")
      commits = await fetchPRCommitMessages()
      console.log(`✅ Fetched ${commits.length} commits`)
    } catch (error) {
      console.warn("⚠️ Failed to fetch commits:", error)
      // Continue without commits - this is optional data, no notification needed
    }

    // Log enhanced features to console only
    const enhancedFeatures = []
    if (filesChanged && filesChanged.length > 0) enhancedFeatures.push(`${filesChanged.length} files`)
    if (commits && commits.length > 0) enhancedFeatures.push(`${commits.length} commits`)

    if (enhancedFeatures.length > 0) {
      console.log(`✅ Enhanced analysis ready: ${enhancedFeatures.join(", ")}`)
    }

    await handleGenerate({
      jira_ticket_id: jiraTicketId,
      pr_title: prTitle,
      code_changes: codeChanges,
      branch_name: branchName,
      commit_messages: commitMessages,
      description_template: descriptionTemplate,
      files_changed: filesChanged,
      commits: commits,
    })
  }

  const handleGenerate = async (payload: {
    jira_ticket_id: string
    pr_title: string
    code_changes: string
    branch_name: string
    commit_messages: string[]
    description_template: string
    files_changed?: ParsedFile[] | null
    commits?: ParsedCommit[] | null
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

      // Extract description from result
      let description = streamingContent || null

      if (result) {
        // Try different response formats
        if (result.generated_description) {
          description = result.generated_description
        } else if (result.generated_content) {
          description = result.generated_content
        } else if (typeof result === 'string') {
          description = result
        } else if (result.text) {
          description = result.text
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

        // Suggested title is handled by the UI directly - no notification needed
        // User can see the suggested title in the interface

        // No success notification needed - user can see the generated content directly
      } else {
        console.error("Generation failed, no valid description found")
        showError("Generation Failed", "Failed to generate description content. Please try again.")
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
    <>
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
    </>
  )
}
