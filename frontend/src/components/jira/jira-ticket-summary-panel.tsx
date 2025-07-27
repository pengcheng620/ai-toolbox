import { marked } from 'marked'
import React, { useEffect, useState, useRef } from "react"

import { useNotification } from "~components/common/notification"
import { useJiraTicketSummaryMessaging } from "~hook/use-api-messaging"
import { getApiConfigSync } from "../../../lib/config/api-config"

export const JiraTicketSummaryCheckPanel = () => {
  const { showError, showWarning, showInfo } = useNotification()
  const { execute, loading, error } = useJiraTicketSummaryMessaging()
  const [streamingContent, setStreamingContent] = useState("")
  const [markdownContent, setMarkdownContent] = useState('Summarizing...')
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

    await handleSummaryCheck(ticketId)
    return;
  }

  const handleSummaryCheck = async (ticketId: string) => {
    if (loading) return

    try {
      const apiConfig = getApiConfigSync()
      const healthCheck = await fetch(apiConfig.endpoints.ai.health)
      if (!healthCheck.ok) throw new Error("Backend API unavailable")
    } catch (error) {
      console.error("Backend API connection failed:", error)
      showError("Connection Failed", "Unable to connect to backend API server. Please ensure the server is running.")
      return
    }

    setStreamingContent("")
    showInfo("Ticket status summarizing", "Summarizing ticket status in real-time...")

    const result = await execute({
      issue_key: ticketId
    }, {
      onChunk: (chunk: string, fullText: string) => {
        setStreamingContent(fullText)
        setSummaryResultAtRealTime(fullText)
      }
    })

    if (result) {
      const finalContent = result.generated_content || streamingContent
      if (finalContent) {
        await setStatusSummaryResult(finalContent)
      }
      setStreamingContent("")
    } else {
      console.error("Status check failed, result is empty")
    }
  }

  const setSummaryResultAtRealTime = async (text: string) => {
    const formattedText = formatMarkdownContent(text)
    setMarkdownContent(formattedText)
  }

  const setStatusSummaryResult = async (text: string) => {
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
      id="jira-status-summary-details-text"
      dangerouslySetInnerHTML={{ 
        __html: marked(markdownContent) 
      }}
    />
  )
}
