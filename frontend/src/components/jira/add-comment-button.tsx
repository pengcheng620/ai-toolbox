import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { useJiraDoDefinitionMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getApiConfigSync } from "../../../lib/config/api-config"

export const GenerateDoDefinitionButton = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useJiraDoDefinitionMessaging()
  const [streamingContent, setStreamingContent] = useState("")

  // Monitor error changes and display notifications
  useEffect(() => {
    if (error) {
      console.error("Jira API Error:", error)
      addNotification({
        type: "error",
        title: "Generation Failed",
        message: error
      })
    }
  }, [error, addNotification])

  const handleClick = async () => {
    const $commentIframe = document.querySelector("#mce_0_ifr")
    if (!$commentIframe) {
      const $commentEditor = document.querySelector("#footer-comment-button")
      if (!$commentEditor) return
      const clickEvent = new MouseEvent("click", {
        bubbles: true, // Event bubbling
        cancelable: true, // Event cancellable
        view: window // Event view (usually window)
      })
      $commentEditor.dispatchEvent(clickEvent)
    }

    const $commentField = document.querySelector("textarea#comment")
    if (!$commentField) return
    const description = document.querySelector("#description-val")?.textContent

    if (!description?.trim()) {
      addNotification({
        type: "warning",
        title: "Warning",
        message: "Task description not found. Please ensure the page is fully loaded."
      })
      return
    }

    await handleGenerateDoD(description)
  }

  const handleGenerateDoD = async (description: string) => {
    if (loading) return

    console.log("🚀 Starting Jira Definition of Done generation (streaming response)...")
    console.log("Task description:", description)

    // First test health check to verify messaging system is working
    console.log("🔍 Testing messaging system connection...")
    try {
      const apiConfig = getApiConfigSync()
      const healthCheck = await fetch(apiConfig.endpoints.ai.health)
      console.log("🔍 Backend API health check:", healthCheck.status)
    } catch (error) {
      console.error("🔍 Backend API connection failed:", error)
      addNotification({
        type: "error",
        title: "Connection Failed",
        message: "Unable to connect to backend API server. Please ensure the server is running."
      })
      return
    }

    // Clear previous streaming content
    setStreamingContent("")

    addNotification({
      type: "info",
      title: "Generating",
      message: "Generating Definition of Done summary in real-time..."
    })

    // Use API to call backend service with streaming response by default
    const result = await execute({
      task_description: description
    }, {
      onChunk: (chunk: string, fullText: string) => {
        console.log("📝 Received streaming content:", chunk)
        setStreamingContent(fullText)
        // Update comment area in real-time
        setCommentAreaRealtime(fullText)
      }
    })

    // If successful, ensure final content is set
    if (result) {
      console.log("✅ Generation successful:", result)
      const finalContent = result.generated_content || streamingContent
      // Ensure final content is properly set
      await setCommentArea(finalContent)
      addNotification({
        type: "info",
        title: "Generation Successful",
        message: "Definition of Done summary has been generated and filled into the form"
      })
      setStreamingContent("")
    } else {
      console.error("❌ Generation failed, result is empty")
    }
  }

  // Real-time update comment area (for streaming response)
  const setCommentAreaRealtime = async (text: string) => {
    // Ensure text has proper formatting
    const formattedText = formatMarkdownContent(text)

    // Update textarea with raw markdown text
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = formattedText
      // Trigger input event
      const event = new Event('input', { bubbles: true })
      $commentField.dispatchEvent(event)
    }

    // Update rich text editor with HTML converted from markdown
    const $commentEditor = document.querySelector(
      "#mce_0_ifr"
    ) as HTMLIFrameElement
    if ($commentEditor) {
      const iframeDocument =
        $commentEditor.contentDocument || $commentEditor.contentWindow?.document
      const targetElement = iframeDocument?.getElementById("tinymce")
      if (targetElement) {
        try {
          // Let marked handle all markdown-to-HTML conversion
          const htmlContent = await marked(formattedText, {
            breaks: true,        // Convert \n to <br>
            gfm: true,          // GitHub Flavored Markdown
            pedantic: false
          })

          targetElement.innerHTML = htmlContent
        } catch (e) {
          console.error("Markdown conversion failed:", e)
          console.error("Original text:", formattedText)
          console.error("Text length:", formattedText.length)
          // Fallback: enhanced line break conversion with proper paragraph handling
          const fallbackHtml = formattedText
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('')
          targetElement.innerHTML = fallbackHtml
        }
      }
    }
  }

  // Format markdown content to ensure proper structure
  const formatMarkdownContent = (text: string): string => {
    if (!text) return text

    let formatted = text.trim()

    // 确保段落标题（独立行的粗体文本）之间有适当的间距
    // 只在粗体文本是独立行且后面跟着非空行时添加换行
    formatted = formatted.replace(/^(\*\*[^*]+\*\*)\s*$/gm, '$1\n')

    // Ensure proper spacing between list items
    formatted = formatted.replace(/^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)/gm, '$1\n$2')

    // 确保句子结束后的段落标题有适当的间距
    formatted = formatted.replace(/([.!?])\s*\n(\*\*[^*]+\*\*)/g, '$1\n\n$2')

    // Clean up excessive newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n')

    return formatted
  }

  const setCommentArea = async (text: string) => {
    // Ensure text has proper formatting
    const formattedText = formatMarkdownContent(text)

    // Update textarea with raw markdown text
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if (!$commentField) {
      console.warn("Comment text field not found")
      return
    }

    $commentField.value = formattedText
    // Trigger input event
    const event = new Event('input', { bubbles: true })
    $commentField.dispatchEvent(event)

    // Update rich text editor with HTML converted from markdown
    const $commentEditor = document.querySelector(
      "#mce_0_ifr"
    ) as HTMLIFrameElement
    if (!$commentEditor) return

    const iframeDocument =
      $commentEditor.contentDocument || $commentEditor.contentWindow?.document
    const targetElement = iframeDocument?.getElementById("tinymce")
    if (targetElement) {
      try {
        // Let marked handle all markdown-to-HTML conversion
        const htmlContent = await marked(formattedText, {
          breaks: true,        // Convert \n to <br>
          gfm: true,          // GitHub Flavored Markdown
          pedantic: false
        })

        targetElement.innerHTML = htmlContent
      } catch (e) {
        console.error("Markdown conversion failed:", e)
        console.error("Original text:", formattedText)
        console.error("Text length:", formattedText.length)
        // Fallback: enhanced line break conversion with proper paragraph handling
        const fallbackHtml = formattedText
          .split('\n\n')
          .map(paragraph => paragraph.trim())
          .filter(paragraph => paragraph.length > 0)
          .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
          .join('')
        targetElement.innerHTML = fallbackHtml
      }
    }
  }

  return (
    <div
      className="aui-buttons"
      onClick={handleClick}
      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
      title="Generate a Definition of Done summary based on the ticket description to help validate if the work meets completion criteria. Includes feature flag assessment, test coverage validation, code review requirements, and quality gates."
    >
      <a
        title="Generate Definition of Done Summary (Real-time Generation)"
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">
          {loading ? "Generating DoD..." : "Generate DoD Summary"}
        </span>
      </a>
    </div>
  )
}
