/**
 * Modern React hook for GitHub DOM operations
 * Replaces the class-based GitHubDOMService with React best practices
 */

import { useState, useCallback, useRef } from "react"
import { getGitHubPageStrategy } from "../../lib/utils/github"

// Constants for edit mode handling
const EDIT_MODE_WAIT_TIME = 3000 // 3 seconds
const EDIT_MODE_CHECK_INTERVAL = 100 // 100ms

export interface GitHubDOMOperationResult {
  success: boolean
  error?: string
}

export interface UseGitHubDOMReturn {
  // State
  isActivatingEditMode: boolean
  lastError: string | null

  // Operations
  clickEditButton: () => Promise<boolean>
  waitForEditMode: (maxWaitTime?: number) => Promise<void>
  fillTextarea: (textarea: HTMLTextAreaElement, content: string) => Promise<void>
  updateTextareaRealtime: (textarea: HTMLTextAreaElement, content: string) => Promise<void>
  setCommentArea: (text: string) => Promise<GitHubDOMOperationResult>
  activateEditModeImmediately: () => Promise<boolean>
  getActiveEditModeTextarea: () => HTMLTextAreaElement | null

  // Revert button operations
  insertRevertButton: (onRevert: () => void) => boolean
  removeRevertButton: () => void
  findCancelButton: () => HTMLButtonElement | null

  // Utilities
  clearError: () => void
}

/**
 * Custom hook for GitHub DOM operations
 * Provides React-integrated DOM manipulation for GitHub pages
 */
export function useGitHubDOM(): UseGitHubDOMReturn {
  const [isActivatingEditMode, setIsActivatingEditMode] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // Use ref for constants to avoid recreating on each render
  const constants = useRef({
    EDIT_MODE_WAIT_TIME,
    EDIT_MODE_CHECK_INTERVAL
  })

  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  const handleError = useCallback((error: unknown, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : `Unknown error in ${operation}`
    setLastError(errorMessage)
    console.error(`GitHub DOM operation failed (${operation}):`, error)
  }, [])

  /**
   * Click the edit button to activate edit mode
   */
  const clickEditButton = useCallback(async (): Promise<boolean> => {
    try {
      clearError()
      const strategy = getGitHubPageStrategy()
      const editButton = strategy.findEditButton()

      if (!editButton) {
        // Additional fallback: try to find any button with "Edit" text
        // Method 1: Look for buttons in comment actions
        const commentActions = document.querySelectorAll('.timeline-comment-actions, .comment-actions')
        for (const container of commentActions) {
          const buttons = container.querySelectorAll('button')
          for (const btn of buttons) {
            const text = btn.textContent?.trim().toLowerCase()
            if (text && text.includes('edit')) {
              try {
                btn.click()
                return true
              } catch (error) {
                console.error("Error clicking edit button (fallback):", error)
              }
            }
          }
        }

        // Method 2: Look for dropdown menus that might contain edit button
        const dropdowns = document.querySelectorAll('details-menu, .dropdown-menu')
        for (const dropdown of dropdowns) {
          const buttons = dropdown.querySelectorAll('button, a')
          for (const btn of buttons) {
            const text = btn.textContent?.trim().toLowerCase()
            if (text && text.includes('edit')) {
              try {
                (btn as HTMLElement).click()
                return true
              } catch (error) {
                console.error("Error clicking edit button (dropdown):", error)
              }
            }
          }
        }

        return false
      }

      // Check if the edit button is in a dropdown menu that needs to be opened first
      const isInDropdown = editButton.closest('details-menu, .dropdown-menu')
      if (isInDropdown) {
        // Find the dropdown trigger
        const dropdownTrigger = document.querySelector('details[data-view-component="true"] summary, .dropdown-toggle')
        if (dropdownTrigger) {
          const triggerElement = dropdownTrigger as HTMLElement
          triggerElement.click()
          // Wait a bit for dropdown to open
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Try direct click first
      try {
        editButton.click()
        return true
      } catch (error) {
        // Fallback to MouseEvent
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        })
        editButton.dispatchEvent(clickEvent)
        return true
      }
    } catch (error) {
      handleError(error, 'clickEditButton')
      return false
    }
  }, [clearError, handleError])

  /**
   * Wait for edit mode to become available
   */
  const waitForEditMode = useCallback(async (maxWaitTime = constants.current.EDIT_MODE_WAIT_TIME): Promise<void> => {
    const startTime = Date.now()
    const strategy = getGitHubPageStrategy()

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const editTextarea = strategy.findEditModeTextarea()

        if (editTextarea) {
          clearInterval(checkInterval)
          resolve()
          return
        }

        // Check timeout
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval)
          reject(new Error("Timeout waiting for edit mode"))
        }
      }, constants.current.EDIT_MODE_CHECK_INTERVAL)
    })
  }, [])

  /**
   * Fill textarea with content and trigger appropriate events
   */
  const fillTextarea = useCallback(async (textarea: HTMLTextAreaElement, content: string): Promise<void> => {
    try {
      clearError()
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
    } catch (error) {
      handleError(error, 'fillTextarea')
      throw error
    }
  }, [clearError, handleError])

  /**
   * Real-time update textarea for streaming response
   */
  const updateTextareaRealtime = useCallback(async (textarea: HTMLTextAreaElement, content: string): Promise<void> => {
    try {
      textarea.value = content
      textarea.textContent = content

      // Trigger input event for real-time updates
      const inputEvent = new Event("input", { bubbles: true })
      textarea.dispatchEvent(inputEvent)

      // Auto-resize textarea
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    } catch (error) {
      handleError(error, 'updateTextareaRealtime')
      // Don't throw for real-time updates to avoid breaking streaming
    }
  }, [handleError])

  /**
   * Set textarea content directly using various selectors
   */
  const setTextareaDirectly = useCallback(async (text: string): Promise<void> => {
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
      $desTextarea = document.querySelector(selector) as HTMLTextAreaElement
      if ($desTextarea) {
        break
      }
    }

    if (!$desTextarea) {
      throw new Error("PR description textarea not found with any selector")
    }

    await fillTextarea($desTextarea, text)

    // Additional events for direct textarea access
    const events = [
      new Event("blur", { bubbles: true })
    ]

    events.forEach(event => {
      $desTextarea!.dispatchEvent(event)
    })
  }, [fillTextarea])

  /**
   * Fill edit mode textarea specifically
   */
  const fillEditModeTextarea = useCallback(async (text: string): Promise<void> => {
    const strategy = getGitHubPageStrategy()
    const editTextarea = strategy.findEditModeTextarea()

    if (!editTextarea) {
      throw new Error("Edit mode textarea not found")
    }

    await fillTextarea(editTextarea, text)
  }, [fillTextarea])

  /**
   * Activate edit mode immediately before API call
   */
  const activateEditModeImmediately = useCallback(async (): Promise<boolean> => {
    try {
      setIsActivatingEditMode(true)
      clearError()
      
      const editButtonClicked = await clickEditButton()
      if (!editButtonClicked) {
        return false
      }
      await waitForEditMode()
      return true
    } catch (error) {
      handleError(error, 'activateEditModeImmediately')
      return false
    } finally {
      setIsActivatingEditMode(false)
    }
  }, [clickEditButton, waitForEditMode, clearError, handleError])

  /**
   * Set comment area with fallback logic
   */
  const setCommentArea = useCallback(async (text: string): Promise<GitHubDOMOperationResult> => {
    try {
      clearError()
      
      // Wait a bit for page to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Try to find and click the edit button
      const editButtonClicked = await clickEditButton()

      if (!editButtonClicked) {
        // Fallback to direct textarea access
        await setTextareaDirectly(text)
        return { success: true }
      }

      // Wait for edit mode to load and fill the textarea
      await waitForEditMode()
      await fillEditModeTextarea(text)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      handleError(error, 'setCommentArea')
      
      // Try fallback to direct textarea access
      try {
        await setTextareaDirectly(text)
        return { success: true }
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'
        return { 
          success: false, 
          error: `Failed to set comment area: ${errorMessage}. Fallback also failed: ${fallbackErrorMessage}` 
        }
      }
    }
  }, [clearError, clickEditButton, setTextareaDirectly, waitForEditMode, fillEditModeTextarea, handleError])

  /**
   * Get the active edit mode textarea if available
   */
  const getActiveEditModeTextarea = useCallback((): HTMLTextAreaElement | null => {
    const strategy = getGitHubPageStrategy()
    return strategy.findEditModeTextarea()
  }, [])

  /**
   * Find the GitHub cancel button in edit mode
   */
  const findCancelButton = useCallback((): HTMLButtonElement | null => {
    try {
      // Try multiple selectors to find the cancel button
      const selectors = [
        'button.js-comment-cancel-button.Button--danger.Button--medium',
        'button.js-comment-cancel-button.Button--danger',
        'button.js-comment-cancel-button',
        'button[class*="js-comment-cancel-button"]',
        'button.Button--danger.Button--medium',
        'button.Button--danger'
      ]

      for (const selector of selectors) {
        const button = document.querySelector(selector) as HTMLButtonElement
        if (button) {
          console.log(`✅ Found cancel button with selector: ${selector}`)
          return button
        }
      }

      // Fallback: search for buttons with "Cancel" text
      const allButtons = document.querySelectorAll('button')
      for (const button of allButtons) {
        const text = button.textContent?.trim().toLowerCase()
        if (text && (text.includes('cancel') || text.includes('close'))) {
          console.log("✅ Found cancel button via text fallback:", button)
          return button as HTMLButtonElement
        }
      }

      console.warn("❌ No cancel button found")
      return null
    } catch (error) {
      console.error("Error finding cancel button:", error)
      return null
    }
  }, [])

  /**
   * Insert the "Revert to Original" button before the cancel button
   */
  const insertRevertButton = useCallback((onRevert: () => void): boolean => {
    try {
      const buttonId = 'ai-toolbox-revert-button'

      // Check if button already exists
      if (document.getElementById(buttonId)) {
        console.log("Revert button already exists, skipping insertion")
        return true
      }

      const cancelButton = findCancelButton()
      if (!cancelButton || !cancelButton.parentNode) {
        console.warn("Cancel button not found, cannot insert revert button")
        return false
      }

      // Create the revert button
      const revertButton = document.createElement('button')
      revertButton.id = buttonId
      revertButton.type = 'button'
      revertButton.className = 'Button Button--secondary Button--medium mr-2'
      revertButton.innerHTML = `
        <span class="Button-content">
          <span class="Button-label">Revert to Original</span>
        </span>
      `
      revertButton.title = 'Revert to original PR description content'

      // Add click handler
      revertButton.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        onRevert()
      })

      // Insert before cancel button
      cancelButton.parentNode.insertBefore(revertButton, cancelButton)
      console.log("✅ Revert button inserted successfully")
      return true
    } catch (error) {
      console.error("Error inserting revert button:", error)
      return false
    }
  }, [findCancelButton])

  /**
   * Remove the "Revert to Original" button
   */
  const removeRevertButton = useCallback((): void => {
    try {
      const buttonId = 'ai-toolbox-revert-button'
      const existingButton = document.getElementById(buttonId)
      if (existingButton) {
        existingButton.remove()
        console.log("✅ Revert button removed successfully")
      }
    } catch (error) {
      console.error("Error removing revert button:", error)
    }
  }, [])

  return {
    // State
    isActivatingEditMode,
    lastError,

    // Operations
    clickEditButton,
    waitForEditMode,
    fillTextarea,
    updateTextareaRealtime,
    setCommentArea,
    activateEditModeImmediately,
    getActiveEditModeTextarea,

    // Revert button operations
    insertRevertButton,
    removeRevertButton,
    findCancelButton,

    // Utilities
    clearError
  }
}
