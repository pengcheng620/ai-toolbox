import { marked } from 'marked'
import React, { useEffect, useState, useRef } from "react"

import { useNotification } from "~components/common/notification"
// 🎯 New Architecture: Use simplified Jira Hook
import { useJiraStatusCheck } from "../../hooks/jira"

export const JiraTicketStatusCheckPanel = () => {
  const { showError, showWarning, showInfo } = useNotification()
  // 🎯 New Architecture: Use simplified Hook
  const { data, loading, error, execute } = useJiraStatusCheck()
  const [streamingContent, setStreamingContent] = useState("")
  const [markdownContent, setMarkdownContent] = useState('Checking...')
  const hasExecuted = useRef(false)

  useEffect(() => {
    if (error) {
      showError("Summary Generation Failed", error)
    }
  }, [error, showError])

  const handleLoading = async () => {
    if (hasExecuted.current) {
      return;
    }

    hasExecuted.current = true;

    const ticketId = extractTicketIdFromUrl();
    console.log("Ticket ID:", ticketId);
    if (!ticketId) {
      console.log("Unable to extract ticket ID from current page URL. Please ensure you are on a valid Jira ticket page.")
      return
    }

    await handleStatusCheck(ticketId)
    return;
  }

  const handleStatusCheck = async (ticketId: string) => {
    if (loading) return

    try {
      setStreamingContent("")
      showInfo("Ticket Status Check", "Checking ticket status in real-time...")

      // 🎯 New Architecture: Simplified execute call with new callback interface
      await execute({
        issue_key: ticketId
      }, {
        onChunk: (fullText: string) => {
          setStreamingContent(fullText)
          setStatusCheckResultAtRealTime(fullText)
        },
        onComplete: (finalContent: string) => {
          setStatusCheckResult(finalContent)
          setStreamingContent("")
          showInfo("Success", "Ticket status check completed successfully!")
        },
        onError: (errorMessage: string) => {
          showError("Status Check Failed", errorMessage)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error("Status check failed:", error)
      showError("Status Check Failed", errorMessage)
    }
  }

  const setStatusCheckResultAtRealTime = async (text: string) => {
    const formattedText = formatMarkdownContent(text)
    setMarkdownContent(formattedText)
  }

  const setStatusCheckResult = async (text: string) => {
    const formattedText = formatMarkdownContent(text)
    setMarkdownContent(formattedText)
  }

  const formatMarkdownContent = (text: string): string => {
    if (!text) return text

    let formatted = text.trim()

    formatted = formatted.replace(/^(\*\*[^*]+\*\*)\s*$/gm, '$1\n')
    formatted = formatted.replace(/^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)/gm, '$1\n$2')
    formatted = formatted.replace(/([.!?])\s*\n(\*\*[^*]+\*\*)/g, '$1\n\n$2')
    formatted = formatted.replace(/(\n-\s+[^\n]+)(\n[^\n-])/g, '$1\n$2')
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n')

    return formatted
  }

  const extractTicketIdFromUrl = (): string | null => {
    try {
      const pathname = window.location.pathname
      const segments = pathname.split('/')
      const ticketId = segments[segments.length - 1]

      const jiraRegex = /^[A-Z]{2,}-\d+$/i
      if (jiraRegex.test(ticketId)) {
        return ticketId.toUpperCase()
      }

      return null
    } catch (error) {
      console.error("Failed to extract ticket ID from URL:", error)
      return null
    }
  }

  handleLoading();
  return (
    <div 
      id="jira-status-checker-details-text"
      dangerouslySetInnerHTML={{ 
        __html: marked(markdownContent) 
      }}
    />
  )
}
