import React, { useEffect } from "react"
import { useNotification } from "~components/common/notification"
import { useGitHubPRFromJiraMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import { githubAPIService } from "../../services/github-api"
import styles from "./add-description.module.css"

// Constants for edit mode handling
const EDIT_MODE_WAIT_TIME = 3000 // 3 seconds
const EDIT_MODE_CHECK_INTERVAL = 100 // 100ms

export const AddDescription = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useGitHubPRFromJiraMessaging()

  // Monitor error changes and show notifications (with debouncing to prevent duplicates)
  useEffect(() => {
    if (error && !loading) {
      // Only show error notification when not loading to avoid duplicates
      addNotification({
        type: "error",
        title: "Generation Failed",
        message: error
      })
    }
  }, [error, loading, addNotification])

  // Function to extract GitHub token from the current page
  const extractGitHubToken = (): string | null => {
    try {
      // Strategy 1: Try to extract from page meta tags
      const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (metaToken) {
        console.log("🔑 Found CSRF token from meta tag")
        return metaToken
      }

      // Strategy 2: Try to extract from global variables
      const windowAny = window as any
      if (windowAny.__INITIAL_DATA__?.user?.token) {
        console.log("🔑 Found token from window.__INITIAL_DATA__")
        return windowAny.__INITIAL_DATA__.user.token
      }

      // Strategy 3: Try to extract from GitHub's global variables
      if (windowAny.github?.token) {
        console.log("🔑 Found token from window.github")
        return windowAny.github.token
      }

      // Strategy 4: Try to extract authenticity token
      const authenticityToken = document.querySelector('input[name="authenticity_token"]')?.getAttribute('value')
      if (authenticityToken) {
        console.log("🔑 Found authenticity token from form input")
        return authenticityToken
      }

      console.log("⚠️ No user token found on page")
      return null
    } catch (error) {
      console.error("❌ Error extracting user token:", error)
      return null
    }
  }

  // Debug function to analyze page elements
  const debugPageElements = () => {
    console.log("🔍 === PAGE ELEMENT DEBUG ===")
    console.log("URL:", window.location.href)
    console.log("Title:", document.title)

    // Check for edit buttons
    const editButtons = document.querySelectorAll('button')
    console.log(`Found ${editButtons.length} buttons on page`)
    editButtons.forEach((btn, i) => {
      const text = btn.textContent?.trim()
      if (text && text.toLowerCase().includes('edit')) {
        console.log(`Edit-like button ${i}:`, {
          text,
          className: btn.className,
          ariaLabel: btn.getAttribute('aria-label'),
          role: btn.getAttribute('role')
        })
      }
    })

    // Check for textareas
    const textareas = document.querySelectorAll('textarea')
    console.log(`Found ${textareas.length} textareas on page`)
    textareas.forEach((ta, i) => {
      console.log(`Textarea ${i}:`, {
        id: ta.id,
        name: ta.name,
        placeholder: ta.placeholder,
        className: ta.className
      })
    })

    console.log("🔍 === END DEBUG ===")
  }

  // Function to immediately activate edit mode before API call
  const activateEditModeImmediately = async (): Promise<boolean> => {
    console.log("🚀 Activating edit mode immediately...")

    try {
      // Step 1: Click the edit button to open edit mode
      console.log("📝 Step 1: Clicking edit button...")
      const editButtonClicked = await clickEditButton()

      if (!editButtonClicked) {
        console.warn("⚠️ Failed to click edit button for immediate activation")
        return false
      }

      // Step 2: Wait for edit mode to load
      console.log("⏳ Step 2: Waiting for edit mode to load...")
      await waitForEditMode()

      console.log("✅ Edit mode activated successfully!")
      return true
    } catch (error) {
      console.error("❌ Error activating edit mode immediately:", error)
      return false
    }
  }

  // Function to fill content directly to an active textarea
  const fillActiveTextarea = async (textarea: HTMLTextAreaElement, content: string): Promise<void> => {
    console.log("📝 Filling content to active textarea...")

    try {
      // Set the value
      textarea.value = content
      textarea.textContent = content

      // Trigger input events to ensure the change is registered
      const inputEvent = new Event("input", { bubbles: true })
      const changeEvent = new Event("change", { bubbles: true })

      textarea.dispatchEvent(inputEvent)
      textarea.dispatchEvent(changeEvent)

      // Focus the textarea to ensure it's active
      textarea.focus()

      // Auto-resize textarea if needed
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'

      console.log("✅ Content filled to active textarea successfully")
    } catch (error) {
      console.error("❌ Error filling active textarea:", error)
      throw error
    }
  }

  // Function to check API connectivity
  const checkAPIConnectivity = async (): Promise<boolean> => {
    try {
      console.log("🔍 Checking API connectivity...")
      const response = await fetch("http://localhost:8000/api/v1/ai/health", {
        method: "GET",
        timeout: 5000
      } as any)

      if (response.ok) {
        console.log("✅ API connectivity check passed")
        return true
      } else {
        console.warn("⚠️ API health check failed:", response.status)
        return false
      }
    } catch (error) {
      console.error("❌ API connectivity check failed:", error)
      return false
    }
  }

  const handleClick = async () => {
    if (loading) return

    // Add debug information
    console.log("🚀 === STARTING HANDLE CLICK ===")

    // Check API connectivity first
    const isAPIConnected = await checkAPIConnectivity()
    if (!isAPIConnected) {
      addNotification({
        type: "error",
        title: "连接失败",
        message: "无法连接到后端服务。请确保后端服务正在运行在 localhost:8000 端口。"
      })
      return
    }

    debugPageElements()

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

    // 2. IMMEDIATELY activate edit mode before API call
    console.log("🚀 === ACTIVATING EDIT MODE IMMEDIATELY ===")
    const editModeActivated = await activateEditModeImmediately()

    if (!editModeActivated) {
      addNotification({
        type: "warning",
        title: "Edit Mode Failed",
        message: "Could not activate edit mode. Continuing with fallback method."
      })
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
    // 3. Get code changes, branch name, and commit messages (async)
    console.log("🔄 Fetching code changes...")
    const codeChanges = await strategy.getCodeChanges()

    const branchName = strategy.getBranchName()

    console.log("🔄 Fetching commit messages...")
    const commitMessages = await strategy.getCommitMessages()

    const descriptionTemplate = strategy.getDescriptionTemplate()


    console.log({codeChanges})
    console.log({branchName})
    console.log({commitMessages})
    console.log({descriptionTemplate})
    console.log("Jira ticket ID:", jiraTicketId)
    console.log("PR title:", prTitle)

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

    // Extract GitHub token for private repository access
    const userToken = extractGitHubToken()
    if (userToken) {
      const tokenPreview = userToken.length > 8 ? `${userToken.substring(0, 8)}...` : "***"
      console.log(`🔑 Using GitHub token for API request (preview: ${tokenPreview})`)
    } else {
      console.log("⚠️ No GitHub token found, using system token")
    }

    addNotification({
      type: "info",
      title: "Generating",
      message: "Fetching Jira, analyzing changes, and generating PR description..."
    })

    try {
      // Check if edit mode is already active
      const strategy = getGitHubPageStrategy()
      const activeTextarea = strategy.findEditModeTextarea()
      let result: any = null

      if (activeTextarea) {
        console.log("✅ Edit mode is active, will stream content directly to textarea")

        // Add GitHub token to payload if available
        const payloadWithToken = userToken ? { ...payload, user_token: userToken } : payload

        // Execute with streaming callback to update textarea in real-time
        result = await execute(payloadWithToken, {
          onChunk: (chunk: string, fullText: string) => {
            console.log("📝 Streaming chunk to active textarea:", chunk.length, "chars")
            activeTextarea.value = fullText
            activeTextarea.textContent = fullText

            // Trigger events to ensure the change is registered
            const inputEvent = new Event("input", { bubbles: true })
            activeTextarea.dispatchEvent(inputEvent)

            // Auto-resize textarea if needed
            activeTextarea.style.height = 'auto'
            activeTextarea.style.height = activeTextarea.scrollHeight + 'px'
          }
        })

        console.log("🔍 API Response Debug (Streaming Mode):", {
          result,
          type: typeof result,
          keys: result ? Object.keys(result) : 'null',
          generated_description: result?.generated_description,
          generated_content: result?.generated_content
        })
      } else {
        console.log("⚠️ Edit mode not active, using standard mode")
        // Add GitHub token to payload if available
        const payloadWithToken = userToken ? { ...payload, user_token: userToken } : payload
        result = await execute(payloadWithToken)

        console.log("🔍 API Response Debug (Standard Mode):", {
          result,
          type: typeof result,
          keys: result ? Object.keys(result) : 'null',
          generated_description: result?.generated_description,
          generated_content: result?.generated_content
        })
      }

      // Check multiple possible response formats
      let description = null
      let suggestedTitle = null

      console.log("🔍 Processing API result:", {
        result,
        resultType: typeof result,
        isNull: result === null,
        isUndefined: result === undefined,
        keys: result ? Object.keys(result) : 'no keys'
      })

      if (result) {
        // Format 1: Direct API response with generated_description
        if (result.generated_description) {
          description = result.generated_description
          suggestedTitle = result.suggested_title
          console.log("✅ Using generated_description format")
        }
        // Format 2: Streaming response wrapped as generated_content
        else if (result.generated_content) {
          description = result.generated_content
          suggestedTitle = result.suggested_title
          console.log("✅ Using generated_content format")
        }
        // Format 3: Check if result is a string (direct content)
        else if (typeof result === 'string') {
          description = result
          console.log("✅ Using string format")
        }
        // Format 4: Check if result has a text field
        else if (result.text) {
          description = result.text
          suggestedTitle = result.suggested_title
          console.log("✅ Using text format")
        }
        // Format 5: Check for any text-like properties
        else {
          console.log("🔍 Checking for alternative text properties...")
          const textProperties = ['content', 'message', 'response', 'data']
          for (const prop of textProperties) {
            if (result[prop] && typeof result[prop] === 'string') {
              description = result[prop]
              console.log(`✅ Using ${prop} property`)
              break
            }
          }
        }
      } else {
        console.warn("⚠️ Result is null or undefined")
      }

      if (description && description.trim()) {
        console.log("✅ Generation successful:", {
          descriptionLength: description.length,
          descriptionPreview: description.substring(0, 100) + "...",
          suggestedTitle
        })

        // If edit mode is already active, fill directly; otherwise use normal flow
        if (activeTextarea) {
          console.log("📝 Filling content directly to active textarea")
          await fillActiveTextarea(activeTextarea, description)
        } else {
          console.log("📝 Using normal setCommentArea flow")
          await setCommentArea(description)
        }

        if (suggestedTitle) {
          addNotification({
            type: "info",
            title: "Suggested Title",
            message: `AI suggests a better title: "${suggestedTitle}"`
          })
        }

        addNotification({
          type: "success",
          title: "Generation Successful",
          message: "PR description has been generated and filled."
        })
      } else {
        console.error("❌ Generation failed, no valid description found")
        console.error("Full result object:", result)

        // Provide more specific error message based on the result
        let errorMessage = "未能生成描述内容，请重试。"

        if (result === null) {
          errorMessage = "API调用返回空结果，可能是网络问题或服务器错误。"
        } else if (result && typeof result === 'object') {
          if (result.error) {
            errorMessage = `生成失败: ${result.error}`
          } else if (Object.keys(result).length === 0) {
            errorMessage = "API返回空对象，请检查请求参数。"
          } else {
            errorMessage = "API返回了意外的数据格式，请联系技术支持。"
          }
        }

        addNotification({
          type: "error",
          title: "生成失败",
          message: errorMessage
        })
      }
    } catch (error) {
      console.error("❌ Generation error:", error)

      // Provide more specific error messages
      let errorTitle = "生成失败"
      let errorMessage = "生成过程中发生错误，请重试。"

      if (error instanceof Error) {
        const errorText = error.message.toLowerCase()

        if (errorText.includes("network") || errorText.includes("fetch") || errorText.includes("connection")) {
          errorTitle = "网络连接错误"
          errorMessage = "无法连接到服务器，请检查网络连接和后端服务状态。"
        } else if (errorText.includes("401") || errorText.includes("认证")) {
          errorTitle = "认证失败"
          errorMessage = "GitHub认证失败，请检查token或重新登录。"
        } else if (errorText.includes("403") || errorText.includes("权限")) {
          errorTitle = "权限不足"
          errorMessage = "访问被拒绝，可能是私有仓库或权限不足。"
        } else if (errorText.includes("404")) {
          errorTitle = "资源未找到"
          errorMessage = "Jira票据或GitHub资源未找到，请检查输入。"
        } else if (errorText.includes("500")) {
          errorTitle = "服务器错误"
          errorMessage = "服务器内部错误，请稍后重试。"
        } else {
          errorMessage = error.message
        }
      }

      addNotification({
        type: "error",
        title: errorTitle,
        message: errorMessage
      })
    }
  }

  const setCommentArea = async (text: string) => {
    console.log("🔄 Starting setCommentArea process...")
    console.log("📄 Generated text length:", text.length)
    console.log("📄 Generated text preview:", text.substring(0, 100) + "...")

    // First, let's check if we're on the right page and elements are available
    console.log("🔍 Current page URL:", window.location.href)
    console.log("🔍 Page title:", document.title)

    try {
      // Step 0: Wait a bit for page to be fully loaded
      console.log("⏳ Step 0: Waiting for page to be ready...")
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 1: Try to find and click the edit button
      console.log("📝 Step 1: Attempting to click edit button...")
      const editButtonClicked = await clickEditButton()

      if (!editButtonClicked) {
        console.warn("⚠️ Failed to click edit button, trying direct textarea access")
        console.log("🔍 Let's check what elements are available on the page...")

        // Debug: List all buttons on the page
        const allButtons = document.querySelectorAll('button')
        console.log(`Found ${allButtons.length} buttons on the page:`)
        allButtons.forEach((btn, index) => {
          console.log(`Button ${index}: "${btn.textContent?.trim()}" - classes: ${btn.className}`)
        })

        addNotification({
          type: "warning",
          title: "Edit Mode Unavailable",
          message: "Using fallback method to fill description."
        })
        return await setTextareaDirectly(text)
      }

      // Step 2: Wait for edit mode to load and fill the textarea
      console.log("⏳ Step 2: Waiting for edit mode to load...")
      await waitForEditMode()

      console.log("✏️ Step 3: Filling edit mode textarea...")
      return await fillEditModeTextarea(text)
    } catch (error) {
      console.error("❌ Error setting comment area:", error)
      addNotification({
        type: "warning",
        title: "Edit Mode Failed",
        message: "Using fallback method to fill description."
      })
      // Fallback to direct textarea access
      return await setTextareaDirectly(text)
    }
  }

  const clickEditButton = async (): Promise<boolean> => {
    console.log("🔍 Starting edit button search...")

    const strategy = getGitHubPageStrategy()
    const editButton = strategy.findEditButton()

    if (!editButton) {
      console.warn("❌ Edit button not found by strategy")

      // Additional fallback: try to find any button with "Edit" text
      console.log("🔍 Trying additional fallback methods...")

      // Method 1: Look for buttons in comment actions
      const commentActions = document.querySelectorAll('.timeline-comment-actions, .comment-actions')
      console.log(`Found ${commentActions.length} comment action containers`)

      for (const container of commentActions) {
        const buttons = container.querySelectorAll('button')
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toLowerCase()
          console.log(`Checking button in comment actions: "${text}"`)
          if (text && text.includes('edit')) {
            console.log("✅ Found edit button in comment actions!")
            try {
              btn.click()
              console.log("✅ Edit button clicked successfully (fallback method)")
              return true
            } catch (error) {
              console.error("❌ Error clicking edit button (fallback):", error)
            }
          }
        }
      }

      // Method 2: Look for dropdown menus that might contain edit button
      const dropdowns = document.querySelectorAll('details-menu, .dropdown-menu')
      console.log(`Found ${dropdowns.length} dropdown menus`)

      for (const dropdown of dropdowns) {
        const buttons = dropdown.querySelectorAll('button, a')
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toLowerCase()
          if (text && text.includes('edit')) {
            console.log("✅ Found edit button in dropdown!")
            try {
              (btn as HTMLElement).click()
              console.log("✅ Edit button clicked successfully (dropdown method)")
              return true
            } catch (error) {
              console.error("❌ Error clicking edit button (dropdown):", error)
            }
          }
        }
      }

      return false
    }

    try {
      console.log("✅ Edit button found by strategy:", editButton)
      console.log("Button details:", {
        tagName: editButton.tagName,
        className: editButton.className,
        textContent: editButton.textContent?.trim(),
        ariaLabel: editButton.getAttribute('aria-label'),
        role: editButton.getAttribute('role')
      })

      // Check if the edit button is in a dropdown menu that needs to be opened first
      const isInDropdown = editButton.closest('details-menu, .dropdown-menu')
      if (isInDropdown) {
        console.log("🔍 Edit button is in a dropdown, looking for trigger...")

        // Find the dropdown trigger (usually a details element or button with dropdown class)
        const dropdownTrigger = document.querySelector('details[data-view-component="true"] summary, .dropdown-toggle')
        if (dropdownTrigger) {
          console.log("🖱️ Opening dropdown first...")
          const triggerElement = dropdownTrigger as HTMLElement
          triggerElement.click()

          // Wait a bit for dropdown to open
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Try multiple click methods
      console.log("🖱️ Attempting to click edit button...")

      // Method 1: Direct click
      try {
        editButton.click()
        console.log("✅ Edit button clicked successfully (direct click)")
        return true
      } catch (error) {
        console.warn("⚠️ Direct click failed, trying MouseEvent...")
      }

      // Method 2: MouseEvent
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
      editButton.dispatchEvent(clickEvent)
      console.log("✅ Edit button clicked successfully (MouseEvent)")
      return true
    } catch (error) {
      console.error("❌ Error clicking edit button:", error)
      return false
    }
  }

  const waitForEditMode = async (maxWaitTime = EDIT_MODE_WAIT_TIME): Promise<void> => {
    const startTime = Date.now()
    const strategy = getGitHubPageStrategy()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Check if edit mode textarea is available using strategy
        const editTextarea = strategy.findEditModeTextarea()

        if (editTextarea) {
          clearInterval(checkInterval)
          console.log("✅ Edit mode textarea found")
          resolve()
          return
        }

        // Check timeout
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval)
          console.warn(`⏰ Timeout waiting for edit mode after ${maxWaitTime}ms`)
          reject(new Error("Timeout waiting for edit mode"))
        }
      }, EDIT_MODE_CHECK_INTERVAL)
    })
  }

  const fillEditModeTextarea = async (text: string): Promise<void> => {
    const strategy = getGitHubPageStrategy()
    const editTextarea = strategy.findEditModeTextarea()

    if (!editTextarea) {
      throw new Error("Edit mode textarea not found")
    }

    // Set the value
    editTextarea.value = text
    editTextarea.textContent = text

    // Trigger input events to ensure the change is registered
    const inputEvent = new Event("input", { bubbles: true })
    const changeEvent = new Event("change", { bubbles: true })

    editTextarea.dispatchEvent(inputEvent)
    editTextarea.dispatchEvent(changeEvent)

    // Focus the textarea to ensure it's active
    editTextarea.focus()

    console.log("Edit mode textarea filled successfully")
  }

  const setTextareaDirectly = async (text: string): Promise<void> => {
    console.log("🔄 Using direct textarea access (fallback method)")

    // Try multiple selectors for the PR description textarea
    const selectors = [
      "textarea#pull_request_body",
      "textarea[name='pull_request[body]']",
      "textarea[placeholder*='description']",
      "textarea[placeholder*='Description']",
      "textarea.js-comment-field"
    ]

    let $desTextarea: HTMLTextAreaElement | null = null

    for (const selector of selectors) {
      console.log(`🔍 Trying direct selector: ${selector}`)
      $desTextarea = document.querySelector(selector) as HTMLTextAreaElement
      if ($desTextarea) {
        console.log("✅ Found textarea with selector:", selector)
        break
      }
    }

    if (!$desTextarea) {
      console.warn("❌ PR description textarea not found with any selector")

      // Debug: List all textareas on the page
      const allTextareas = document.querySelectorAll('textarea')
      console.log(`Found ${allTextareas.length} textareas on the page:`)
      allTextareas.forEach((textarea, index) => {
        console.log(`Textarea ${index}:`, {
          id: textarea.id,
          name: textarea.name,
          placeholder: textarea.placeholder,
          className: textarea.className
        })
      })
      return
    }

    console.log("📝 Setting textarea value...")
    $desTextarea.value = text
    $desTextarea.textContent = text

    // Trigger multiple events to ensure the change is registered
    const events = [
      new Event("input", { bubbles: true }),
      new Event("change", { bubbles: true }),
      new Event("blur", { bubbles: true })
    ]

    events.forEach(event => {
      $desTextarea!.dispatchEvent(event)
    })

    // Focus the textarea
    $desTextarea.focus()

    console.log("✅ Direct textarea access completed successfully")
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
          <span>Generate</span>
        </>
      )}
    </div>
  )
}
