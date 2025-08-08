import React, { useEffect, useState, useCallback, useRef } from "react"
import { useNotification } from "~components/common/notification"
// 🎯 New Architecture: Use simplified GitHub Hook
import { useGitHubPRDescriptionWithValidation } from "../../hooks/github"

import {
  fetchPRCommitMessages,
  fetchPRFileChanges,
  type ParsedFile,
  type ParsedCommit
} from "../../services/github-pr-page-service"
import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import { useGitHubDOM } from "../../hooks/github/use-github-dom"
import styles from "./add-description.module.css"
import { getApiConfigSync } from "../../../lib/config/api-config"
import { JiraTicketInput } from "./jira-ticket-input"
import GitHubCacheManager from "../../services/github-cache-manager"

// Custom debounce hook
const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

export const AddDescription = () => {
  const { showError, showWarning } = useNotification()
  // 🎯 New Architecture: Use simplified Hook
  const { data, loading, error, execute } = useGitHubPRDescriptionWithValidation()
  const githubDOM = useGitHubDOM()
  const [originalContent, setOriginalContent] = useState<string>("")
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [showJiraInput, setShowJiraInput] = useState(false)
  const [pendingGenerationData, setPendingGenerationData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false) // Prevent duplicate processing

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

  // Initialize cache warm-up on component mount
  useEffect(() => {
    // Warm up cache in background for better performance
    // GitHubCacheManager.warmUpCurrentPR().catch(error => {
    //   console.warn('Cache warm-up failed:', error)
    // })
  }, [])

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

  const handleClickInternal = async () => {
    if (loading || isProcessing || showJiraInput) return // Also prevent if popover is already open

    // Prevent duplicate processing
    setIsProcessing(true)

    try {
      const strategy = getGitHubPageStrategy()

      // Store original content before generation
      storeOriginalContent()

      // Get PR title
      const prTitle = strategy.getPRTitle()
      if (!prTitle) {
        showWarning("Missing Title", "Could not detect a Pull Request title on the page.")
        return
      }

      // Get Jira ticket - now optional
      let jiraTicketId = strategy.extractJiraTicketId()
      if (!jiraTicketId) {
        // Store the generation data and show the Jira input modal
        // API connectivity check will happen after popover opens
        const generationData = {
          prTitle,
          codeChanges: await strategy.getCodeChanges(),
          branchName: strategy.getBranchName(),
          commitMessages: await strategy.getCommitMessages(),
          descriptionTemplate: strategy.getDescriptionTemplate()
        }

        setPendingGenerationData(generationData)
        setShowJiraInput(true)
        return
      }

      // If we have Jira ticket, check API connectivity before proceeding
      const isAPIConnected = await checkAPIConnectivity()
      if (!isAPIConnected) {
        showError("Connection Failed", "Unable to connect to backend service. Please ensure the backend service is running on localhost:8077.")
        return
      }

      // Activate edit mode before API call
      await activateEditModeImmediately()
      // Edit mode failure is handled gracefully with fallback - no notification needed

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

      // Continue with generation using the detected Jira ticket
      await continueWithGeneration(jiraTicketId, {
        prTitle,
        codeChanges,
        branchName,
        commitMessages,
        descriptionTemplate,
        filesChanged,
        commits
      })
    } finally {
      // Always reset processing state
      setIsProcessing(false)
    }
  }

  // Create debounced version of handleClick with 300ms delay
  const handleClick = useDebounce(handleClickInternal, 300)

  // Handle Jira ticket input submission
  const handleJiraTicketSubmit = async (jiraTicketId: string | null) => {
    setShowJiraInput(false)

    if (pendingGenerationData) {
      // Check API connectivity after popover closes
      const isAPIConnected = await checkAPIConnectivity()
      if (!isAPIConnected) {
        showError("Connection Failed", "Unable to connect to backend service. Please ensure the backend service is running on localhost:8077.")
        setPendingGenerationData(null)
        return
      }

      // Activate edit mode before API call
      await activateEditModeImmediately()
      // Edit mode failure is handled gracefully with fallback - no notification needed

      await continueWithGeneration(jiraTicketId, pendingGenerationData)
      setPendingGenerationData(null)
    }
  }

  // Handle Jira ticket input cancellation
  const handleJiraTicketCancel = () => {
    setShowJiraInput(false)
    setPendingGenerationData(null)
    setIsProcessing(false) // Reset processing state on cancel
  }

  // Continue with generation after Jira ticket is resolved
  const continueWithGeneration = async (jiraTicketId: string | null, data: {
    prTitle: string
    codeChanges: string
    branchName: string
    commitMessages: string[]
    descriptionTemplate: string
    filesChanged?: any
    commits?: any
  }) => {
    // Fetch enhanced data if not already provided
    let { filesChanged, commits } = data

    if (!filesChanged || !commits) {
      console.log("🔍 Fetching enhanced PR data...")

      // Fetch file changes silently - no notifications for optional data
      if (!filesChanged) {
        try {
          console.log("📁 Fetching detailed file changes...")
          filesChanged = await fetchPRFileChanges()
          console.log(`✅ Fetched ${filesChanged.length} file changes`)
        } catch (error) {
          console.warn("⚠️ Failed to fetch file changes:", error)
          // Continue without file changes - this is optional data, no notification needed
        }
      }

      // Fetch commit information silently - no notifications for optional data
      if (!commits) {
        try {
          console.log("📝 Fetching detailed commit information...")
          commits = await fetchPRCommitMessages()
          console.log(`✅ Fetched ${commits.length} commits`)
        } catch (error) {
          console.warn("⚠️ Failed to fetch commits:", error)
          // Continue without commits - this is optional data, no notification needed
        }
      }

      // Log enhanced features to console only
      const enhancedFeatures = []
      if (filesChanged && filesChanged.length > 0) enhancedFeatures.push(`${filesChanged.length} files`)
      if (commits && commits.length > 0) enhancedFeatures.push(`${commits.length} commits`)

      if (enhancedFeatures.length > 0) {
        console.log(`✅ Enhanced analysis ready: ${enhancedFeatures.join(", ")}`)
      }
    }

    await handleGenerate({
      jira_ticket_id: jiraTicketId || "", // Use empty string if null (skip Jira integration)
      pr_title: data.prTitle,
      code_changes: data.codeChanges,
      branch_name: data.branchName,
      commit_messages: data.commitMessages,
      description_template: data.descriptionTemplate,
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

      // 🎯 New Architecture: Unified execute call with callbacks
      await execute(payload, {
        onChunk: (fullText: string) => {
          console.log("Received streaming content:", fullText)
          setStreamingContent(fullText)
          
          // Real-time update for active textarea
          if (activeTextarea) {
            githubDOM.updateTextareaRealtime(activeTextarea, fullText)
          }
        },
        onComplete: async (finalContent: string) => {
          console.log("Generation completed:", finalContent)
          
          if (finalContent && finalContent.trim()) {
            // Mark that content has been generated
            setHasGeneratedContent(true)

            // If edit mode is not active, set the comment area
            if (!activeTextarea) {
              const result = await githubDOM.setCommentArea(finalContent)
              if (!result.success) {
                console.error("Failed to set comment area:", result.error)
                showError("Update Failed", "Failed to update description area. Please try again.")
              }
            }

            // Clear streaming content
            setStreamingContent("")
            
            // Success is implicit - user can see the generated content
            console.log("✅ PR description generated successfully")
          } else {
            console.error("Generation completed but no valid content found")
            showError("Generation Failed", "Failed to generate description content. Please try again.")
          }
        },
        onError: (errorMessage: string) => {
          console.error("Generation failed:", errorMessage)
          showError("Generation Failed", errorMessage)
        }
      })
    } catch (error) {
      console.error("Generation error:", error)
      // Error handling is now centralized in the API hook
      // The hook will set the error state which triggers the useEffect above
    }
  }



  return (
    <>
      {/* Jira Ticket Input Popover */}
      <JiraTicketInput
        isOpen={showJiraInput}
        onSubmit={handleJiraTicketSubmit}
        onCancel={handleJiraTicketCancel}
      >
        <div
          onClick={handleClick}
          style={{
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 8px",
            borderRadius: "6px",
            backgroundColor: "#f6f8fa",
            border: "1px solid #d0d7de",
            fontSize: "12px",
            fontWeight: "500",
            color: "#24292f",
            textDecoration: "none",
            whiteSpace: "nowrap"
          }}
          title="Generate PR description from a Jira ticket and code changes">
          {loading ? (
            <>
              <SparklesIcon className={styles.iconLoading} />
              <span style={{ marginLeft: "4px" }}>Generating...</span>
            </>
          ) : (
            <>
              <SparklesIcon className={styles.icon} />
              <span style={{ marginLeft: "4px" }}>Generate</span>
            </>
          )}
        </div>
      </JiraTicketInput>
    </>
  )
}
