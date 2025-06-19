import React, { useEffect } from "react"
import { useNotification } from "~components/common/notification"
import { useGitHubPRFromJiraMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import styles from "./add-description.module.css"

export const AddDescription = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useGitHubPRFromJiraMessaging()

  // Monitor error changes and show notifications
  useEffect(() => {
    if (error) {
      addNotification({
        type: "error",
        title: "Generation Failed",
        message: error
      })
    }
  }, [error, addNotification])

  const handleClick = async () => {
    if (loading) return

    const strategy = getGitHubPageStrategy()

    // 1. Get PR title
    const prTitle = strategy.getPRTitle()
    if (!prTitle) {
      addNotification({
        type: "warning",
        title: "Missing Title",
        message: "Could not detect a Pull Request title on the page."
      })
      return
    }

    // 2. Get Jira ticket
    let jiraTicketId = strategy.extractJiraTicketId()

    if (!jiraTicketId) {
      jiraTicketId = window.prompt(
        "Could not automatically detect a Jira ticket ID. Please enter one (e.g., PROJ-123):"
      )
      if (!jiraTicketId) {
        addNotification({
          type: "warning",
          title: "Cancelled",
          message: "Jira ticket ID is required for generation."
        })
        return
      }
    }

    // 3. Get code changes, branch name, and commit messages
    const codeChanges = strategy.getCodeChanges()
    const branchName = strategy.getBranchName()
    const commitMessages = strategy.getCommitMessages()
    const descriptionTemplate = strategy.getDescriptionTemplate()

    if (!codeChanges) {
      addNotification({
        type: "warning",
        title: "No Changes Found",
        message: "Could not detect any code changes on the page."
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

    console.log("🚀 Starting GitHub PR generation from Jira...", payload)

    addNotification({
      type: "info",
      title: "Generating",
      message: "Fetching Jira, analyzing changes, and generating PR description..."
    })

    const result = await execute(payload)

    if (result?.generated_description) {
      console.log("✅ Generation successful:", result)
      await setCommentArea(result.generated_description)
      if (result.suggested_title) {
        addNotification({
          type: "info",
          title: "Suggested Title",
          message: `AI suggests a better title: "${result.suggested_title}"`
        })
      }
      addNotification({
        type: "success",
        title: "Generation Successful",
        message: "PR description has been generated and filled."
      })
    } else {
      console.error("❌ Generation failed, result is empty or has an error")
    }
  }

  const setCommentArea = async (text: string) => {
    const $desTextarea = document.querySelector(
      "textarea#pull_request_body"
    ) as HTMLTextAreaElement
    if (!$desTextarea) {
      console.warn("PR description textarea not found")
      return
    }
    $desTextarea.value = text
    $desTextarea.innerText = text

    const event = new Event("input", { bubbles: true })
    $desTextarea.dispatchEvent(event)
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
          <span>AI Generate from Jira</span>
        </>
      )}
    </div>
  )
}
