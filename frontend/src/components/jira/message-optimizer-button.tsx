import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { useJiraMessageOptimizeWithValidation } from "../../hooks/jira"

import { SparklesIcon } from "../../../lib/icons/heroicon"

export const MessageOptimizerButton = () => {
  const { showError, showWarning, showInfo } = useNotification()
  const { data, loading, error, execute } = useJiraMessageOptimizeWithValidation()
  const [streamingContent, setStreamingContent] = useState("")

  useEffect(() => {
    if (error) {
      showError("Message Optimization Failed", error)
    }
  }, [error, showError])

  const handleClick = async () => {
    const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
    if (!$commentField) {
      console.log("Comment field not found, stopping.");
      return;
    }

    const ticketId = extractTicketIdFromUrl();
    console.log("Ticket ID:", ticketId);
    if (!ticketId) {
      console.log("Unable to extract ticket ID from current page URL. Please ensure you are on a valid Jira ticket page.")
      return
    }

    const currentMessage = $commentField.value;
    console.log("Current Message:", currentMessage);
    if (!currentMessage) {
      console.log("No message to optimize.")
      return
    }

    await handleOptimizeMessage(ticketId, currentMessage)
    return;
  }

  const handleOptimizeMessage = async (ticketId: string, currentMessage: string) => {
    if (loading) return

    try {
      setStreamingContent("")
      showInfo("Optimizing", "Optimizing message in real-time...")

      await execute({
        issue_key: ticketId,
        message_to_optimize: currentMessage
      }, {
        onChunk: (fullText: string) => {
          setStreamingContent(fullText)
          setCommentAreaRealtime(fullText)
        },
        onComplete: (finalContent: string) => {
          setCommentArea(finalContent)
          setStreamingContent("")
          showInfo("Success", "Message optimization completed!")
        },
        onError: (errorMessage: string) => {
          showError("Optimization Failed", errorMessage)
        }
      })

    } catch (error) {
      console.error("❌ Optimization failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError("Optimization Failed", errorMessage)
      setStreamingContent("")
    }
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

  return (
    <div
      className="aui-buttons"
      onClick={handleClick}
      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
      title="Optimize the message for the ticket."
    >
      <a
        title="Optimize the message for the ticket."
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">
          {loading ? "Optimizing Message..." : "Optimize Message"}
        </span>
      </a>
    </div>
  )
}
