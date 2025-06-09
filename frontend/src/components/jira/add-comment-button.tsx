import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { useJiraDoDefinitionMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"

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
      const healthCheck = await fetch("http://localhost:8000/api/v1/ai/health")
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
    // Update textarea with raw markdown text
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = text
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
          const htmlContent = await marked(text, {
            breaks: true,        // Convert \n to <br>
            gfm: true,          // GitHub Flavored Markdown
            pedantic: false
          })

          targetElement.innerHTML = htmlContent
        } catch (e) {
          console.error("Markdown conversion failed:", e)
          console.error("Original text:", text)
          console.error("Text length:", text.length)
          // Fallback: simple line break conversion
          targetElement.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`
        }
      }
    }
  }

  const setCommentArea = async (text: string) => {
    // Update textarea with raw markdown text
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if (!$commentField) {
      console.warn("Comment text field not found")
      return
    }

    $commentField.value = text
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
        const htmlContent = await marked(text, {
          breaks: true,        // Convert \n to <br>
          gfm: true,          // GitHub Flavored Markdown
          pedantic: false
        })

        targetElement.innerHTML = htmlContent
      } catch (e) {
        console.error("Markdown conversion failed:", e)
        console.error("Original text:", text)
        console.error("Text length:", text.length)
        // Fallback: simple line break conversion
        targetElement.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`
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
