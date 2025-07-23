import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { useJiraTicketSummaryMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getApiConfigSync } from "../../../lib/config/api-config"

export const GenerateTicketSummaryButton = () => {
  const { showError, showWarning, showInfo } = useNotification()
  const { execute, loading, error } = useJiraTicketSummaryMessaging()
  const [streamingContent, setStreamingContent] = useState("")

  useEffect(() => {
    if (error) {
      showError("Summary Generation Failed", error)
    }
  }, [error, showError])

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

  const handleClick = async () => {
    const $commentIframe = document.querySelector("#mce_0_ifr")
    if (!$commentIframe) {
      const $commentEditor = document.querySelector("#footer-comment-button")
      if (!$commentEditor) return
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
      $commentEditor.dispatchEvent(clickEvent)
    }

    const $commentField = document.querySelector("textarea#comment")
    if (!$commentField) return

    const ticketId = extractTicketIdFromUrl()
    if (!ticketId) {
      showWarning("Warning", "Unable to extract ticket ID from current page URL. Please ensure you are on a valid Jira ticket page.")
      return
    }

    await handleGenerateTicketSummary(ticketId)
  }

  const handleGenerateTicketSummary = async (issueKey: string) => {
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
    showInfo("Generating", "Generating intelligent ticket summary in real-time...")

    const result = await execute({
      issue_key: issueKey
    }, {
      onChunk: (chunk: string, fullText: string) => {
        setStreamingContent(fullText)
        setCommentAreaRealtime(fullText)
      }
    })

    if (result) {
      const finalContent = result.generated_content || streamingContent
      if (finalContent) {
        await setCommentArea(finalContent)
      }
      setStreamingContent("")
    } else {
      console.error("Generation failed, result is empty")
    }
  }

  const generateTinyMCEFriendlyHTML = (text: string): string => {
    if (!text) return ''
    
    let paragraphs: string[]
    
    if (text.includes('\n\n')) {
      paragraphs = text.split('\n\n')
    } else {
      paragraphs = [text]
    }
    
    const htmlParts = paragraphs
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map((paragraph) => {
        const isListParagraph = paragraph.includes('\n- ') || paragraph.startsWith('- ')
        
        if (isListParagraph) {
          const items = paragraph.split('\n')
            .filter(line => line.trim().startsWith('- '))
            .map(item => item.trim().slice(2).trim())
          return `<ul>${items.map(item => `<li>${item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>`
        } else {
          const formatted = paragraph
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
          return `<p>${formatted}</p>`
        }
      })
    
    return htmlParts.join('')
  }

  const setCommentAreaRealtime = async (text: string) => {
    const formattedText = formatMarkdownContent(text)

    const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = formattedText
      const inputEvent = new Event('input', { bubbles: true })
      $commentField.dispatchEvent(inputEvent)
    }

    const $commentEditor = document.querySelector("#mce_0_ifr") as HTMLIFrameElement
    if ($commentEditor) {
      const iframeDocument = $commentEditor.contentDocument || $commentEditor.contentWindow?.document
      const targetElement = iframeDocument?.getElementById("tinymce")
      if (targetElement) {
        const htmlContent = generateTinyMCEFriendlyHTML(text)
        targetElement.innerHTML = htmlContent
        
        setTimeout(() => {
          if (targetElement) {
            targetElement.focus()
            const inputEvent = new Event('input', { bubbles: true })
            targetElement.dispatchEvent(inputEvent)
          }
        }, 100)
      }
    }
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

  const setCommentArea = async (text: string) => {
    const formattedText = formatMarkdownContent(text)

    const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
    if (!$commentField) {
      console.warn("Comment text field not found")
      return
    }

    $commentField.value = formattedText
    
    const inputEvent = new Event('input', { bubbles: true })
    $commentField.dispatchEvent(inputEvent)
    
    const changeEvent = new Event('change', { bubbles: true })
    $commentField.dispatchEvent(changeEvent)

    const $commentEditor = document.querySelector("#mce_0_ifr") as HTMLIFrameElement
    if (!$commentEditor) return

    const iframeDocument = $commentEditor.contentDocument || $commentEditor.contentWindow?.document
    const targetElement = iframeDocument?.getElementById("tinymce")
    if (targetElement) {
      const htmlContent = generateTinyMCEFriendlyHTML(text)
      targetElement.innerHTML = htmlContent
      
      setTimeout(() => {
        if (targetElement) {
          targetElement.focus()
          const inputEvent = new Event('input', { bubbles: true })
          targetElement.dispatchEvent(inputEvent)
          
          const changeEvent = new Event('change', { bubbles: true })
          targetElement.dispatchEvent(changeEvent)
        }
      }, 100)
    }
  }

  return (
    <div
      className="aui-buttons"
      onClick={handleClick}
      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
      title="Generate an intelligent summary of this ticket including key decisions, action items, and current status. Analyzes ticket content and all comments to provide comprehensive insights."
    >
      <a
        title="Generate Intelligent Ticket Summary (Real-time Generation)"
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">
          {loading ? "Generating Summary..." : "Generate Ticket Summary"}
        </span>
      </a>
    </div>
  )
}
