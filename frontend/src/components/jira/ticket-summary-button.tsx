import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { sendHealthCheck, sendJiraMessage } from "../../../lib/utils/messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"

export const GenerateTicketSummaryButton = () => {
  const { showError, showWarning, showInfo } = useNotification()
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")

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

    setLoading(true)
    
    try {
      // 1. 健康检查 - 通过消息传递
      console.log("🏥 Performing health check via messaging...")
      await sendHealthCheck()
      console.log("✅ Health check passed")
    } catch (error) {
      console.error("❌ Backend API connection failed:", error)
      showError("Connection Failed", "Unable to connect to backend API server. Please ensure the server is running.")
      setLoading(false)
      return
    }

    try {
      setStreamingContent("")
      showInfo("Generating", "Generating intelligent ticket summary via secure messaging...")

      // 2. Jira API 调用 - 通过消息传递
      console.log("🎯 Calling Jira API via messaging for issue:", issueKey)
      const result = await sendJiraMessage({
        issue_key: issueKey
      })

      if (result.success && result.data) {
        const finalContent = result.data.generated_content || ""
        console.log("✅ Generated content received:", finalContent.slice(0, 100) + "...")
        
        if (finalContent) {
          await setCommentArea(finalContent)
          showInfo("Success", "Ticket summary generated successfully!")
        } else {
          throw new Error("Generated content is empty")
        }
      } else {
        throw new Error(result.error || "Generation failed")
      }
    } catch (error) {
      console.error("❌ Generation failed:", error)
      showError("Generation Failed", error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setLoading(false)
      setStreamingContent("")
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
