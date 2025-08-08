import React, { useState, useCallback, useMemo, useRef } from "react"

import { useNotification } from "~components/common/notification"
import { ConnectionStatusIndicator } from "~components/common/connection-status-indicator"
import { useJiraTicketSummaryWithValidation } from "../../hooks/jira"

export const GenerateTicketSummaryButton = () => {
  const { showError, showWarning, showInfo } = useNotification()
  const { loading, error, execute } = useJiraTicketSummaryWithValidation()
  
  const [streamingContent, setStreamingContent] = useState("")
  const lastUpdateTimeRef = useRef<number>(0)
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized formatting functions - defined early to be used in callbacks
  const formatMarkdownContent = useMemo(() => (text: string): string => {
    if (!text) return text

    let formatted = text.trim()

    // Apply markdown formatting rules
    formatted = formatted.replace(/^(\*\*[^*]+\*\*)\s*$/gm, '$1\n')
    formatted = formatted.replace(/^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)/gm, '$1\n$2')
    formatted = formatted.replace(/([.!?])\s*\n(\*\*[^*]+\*\*)/g, '$1\n\n$2')
    formatted = formatted.replace(/(\n-\s+[^\n]+)(\n[^\n-])/g, '$1\n$2')
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n')

    return formatted
  }, [])

  const generateTinyMCEFriendlyHTML = useMemo(() => (text: string): string => {
    if (!text) return ''
    
    let paragraphs: string[]
    
    // 🔧 Debug log: check line break handling
    console.log(`🔧 Original text length: ${text.length} First 100 chars:`, text.slice(0, 100))
    
    if (text.includes('\n\n')) {
      paragraphs = text.split('\n\n')
      console.log("🔧 ✅ Using \\n\\n split, found", paragraphs.length, "paragraphs")
    } else {
      paragraphs = [text]
      console.log("🔧 ⚠️ No \\n\\n found, treating as single paragraph")
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
    
    const result = htmlParts.join('')
    console.log(`🔧 Generated ${htmlParts.length} HTML elements`)
    return result
  }, [])

  // Throttled DOM update function to improve performance
  const throttledDOMUpdate = useCallback((content: string) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current
    
    // Throttle updates to max 10 per second for performance
    if (timeSinceLastUpdate < 100) {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current)
      }
      
      updateThrottleRef.current = setTimeout(() => {
        setCommentAreaRealtime(content)
        lastUpdateTimeRef.current = Date.now()
      }, 100 - timeSinceLastUpdate)
    } else {
      setCommentAreaRealtime(content)
      lastUpdateTimeRef.current = now
    }
  }, []) // Removed complex DOM caching - using simple queries like old component

  const extractJiraTicketInfo = useCallback(() => {
    // From URL get issue key
    const urlMatch = window.location.href.match(/\/browse\/([A-Z]+-\d+)/)
    if (urlMatch) {
      return { issue_key: urlMatch[1] }
    }
    
    // From page elements get issue key
    const issueKeyElement = document.querySelector('[data-issue-key]')
    if (issueKeyElement) {
      return { issue_key: issueKeyElement.getAttribute('data-issue-key') || '' }
    }
    
    // From title get issue key  
    const titleElement = document.querySelector('#key-val, [data-test-id="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')
    if (titleElement && titleElement.textContent) {
      const key = titleElement.textContent.trim()
      if (/^[A-Z]+-\d+$/.test(key)) {
        return { issue_key: key }
      }
    }
    
    throw new Error('Could not extract Jira ticket key from current page')
  }, [])

  const handleClick = useCallback(async () => {
    try {
      setStreamingContent("")
      
      // Ensure comment editor is activated
      const $commentIframe = document.querySelector("#mce_0_ifr") as HTMLIFrameElement
      const $commentEditor = document.querySelector("#footer-comment-button") as HTMLElement
      const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
      
      if (!$commentIframe && $commentEditor) {
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        })
        $commentEditor.dispatchEvent(clickEvent)
        
        // Wait for editor to load
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Final check
      const $finalCommentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
      if (!$finalCommentField) {
        showError("Comment Field Not Found", "Could not find comment text area. Please ensure you are on a valid Jira ticket page.")
        return
      }

      showInfo("Generating", "Generating intelligent ticket summary with real-time streaming...")

      const ticketInfo = extractJiraTicketInfo()
      
      await execute(ticketInfo, {
        onChunk: (fullText: string) => {
          setStreamingContent(fullText)
          throttledDOMUpdate(fullText)
        },
        onComplete: (finalContent: string) => {
          // Handle the final content here
          const formattedText = formatMarkdownContent(finalContent)
          
          // Update textarea with events
          const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
          if ($commentField) {
            $commentField.value = formattedText
            
            const inputEvent = new Event('input', { bubbles: true })
            $commentField.dispatchEvent(inputEvent)
            
            const changeEvent = new Event('change', { bubbles: true })
            $commentField.dispatchEvent(changeEvent)
          }

          // Update TinyMCE editor with focus
          const $commentEditor = document.querySelector("#mce_0_ifr") as HTMLIFrameElement
          if ($commentEditor) {
            const iframeDocument = $commentEditor.contentDocument || $commentEditor.contentWindow?.document
            const targetElement = iframeDocument?.getElementById("tinymce")
            if (targetElement) {
              const htmlContent = generateTinyMCEFriendlyHTML(finalContent)
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
          
          showInfo("Success", "Ticket summary generated successfully!")
        },
        onError: (errorMessage: string) => {
          showError("Generation Failed", errorMessage)
        }
      })

    } catch (error) {
      console.error("❌ Generation failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError("Generation Failed", errorMessage)
    } finally {
      setStreamingContent("")
    }
  }, [
    execute,
    extractJiraTicketInfo,
    showError,
    showInfo,
    throttledDOMUpdate,
    formatMarkdownContent,
    generateTinyMCEFriendlyHTML
  ])

  const handleCancel = useCallback(async () => {
    try {
      setStreamingContent("")
      showInfo("Cancelled", "Generation was cancelled.")
      // Note: In the new architecture, cancellation is automatically handled by disconnecting the Port
    } catch (error) {
      console.error("Failed to cancel:", error)
    }
  }, [showInfo])

  // Real-time DOM update during streaming
  const setCommentAreaRealtime = useCallback((text: string) => {
    const formattedText = formatMarkdownContent(text)

    // Update textarea
    const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = formattedText
      const inputEvent = new Event('input', { bubbles: true })
      $commentField.dispatchEvent(inputEvent)
    }

    // Update TinyMCE editor
    const $commentEditor = document.querySelector("#mce_0_ifr") as HTMLIFrameElement
    if ($commentEditor) {
      const iframeDocument = $commentEditor.contentDocument || $commentEditor.contentWindow?.document
      const targetElement = iframeDocument?.getElementById("tinymce")
      if (targetElement) {
        const htmlContent = generateTinyMCEFriendlyHTML(text)
        targetElement.innerHTML = htmlContent
      }
    }
  }, [formatMarkdownContent, generateTinyMCEFriendlyHTML])

  // Final DOM update after completion
  const setCommentAreaFinal = useCallback((text: string) => {
    const formattedText = formatMarkdownContent(text)

    // Update textarea with events
    const $commentField = document.querySelector("textarea#comment") as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = formattedText
      
      const inputEvent = new Event('input', { bubbles: true })
      $commentField.dispatchEvent(inputEvent)
      
      const changeEvent = new Event('change', { bubbles: true })
      $commentField.dispatchEvent(changeEvent)
    }

    // Update TinyMCE editor with focus
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
            
            const changeEvent = new Event('change', { bubbles: true })
            targetElement.dispatchEvent(changeEvent)
          }
        }, 100)
      }
    }
  }, [formatMarkdownContent, generateTinyMCEFriendlyHTML])

  const isDisabled = loading
  const buttonText = useMemo(() => {
    if (loading) return "Generating Summary..."
    return "Generate Ticket Summary"
  }, [loading])

  return (
    <div className="aui-buttons" style={{ position: 'relative' }}>
      <div
        onClick={isDisabled ? undefined : handleClick}
        style={{ 
          cursor: isDisabled ? "not-allowed" : "pointer", 
          opacity: isDisabled ? 0.6 : 1,
          position: 'relative'
        }}
        title="Generate an intelligent summary of this ticket including key decisions, action items, and current status. Analyzes ticket content and all comments to provide comprehensive insights."
      >
        <a
          title="Generate Intelligent Ticket Summary (Real-time Streaming)"
          className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
          style={{ display: "flex", alignItems: "center", paddingRight: '8px' }}>
          
          {/* Connection status indicator with integrated SparklesIcon */}
          <ConnectionStatusIndicator 
            portName="jira-ticket-summary"
            size={20}
            style={{ marginRight: '8px' }}
          />
          
          <span className="trigger-label">
            {buttonText}
          </span>
        </a>
      </div>
      
      {/* Cancel button when loading */}
      {loading && (
        <div
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: '0',
            right: '-80px',
            cursor: 'pointer',
            background: '#ef4444',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
            display: 'none'
          }}
          title="Cancel generation"
        >
          Cancel
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          color: '#dc2626',
          maxWidth: '300px',
          zIndex: 1000,
          marginTop: '4px'
        }}>
          {error}
        </div>
      )}
      
      {/* Streaming progress indicator */}
      {streamingContent && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          color: '#0369a1',
          maxWidth: '300px',
          zIndex: 1000,
          marginTop: '4px',
          display: 'none'
        }}>
          Streaming... ({streamingContent.length} characters received)
        </div>
      )}
    </div>
  )
}

export default GenerateTicketSummaryButton