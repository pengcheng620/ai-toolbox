/**
 * Example usage of the optimized notification system
 * This file demonstrates best practices for using notifications
 */

import React from "react"
import { useNotification } from "~components/common/notification"
import { NotificationPresets } from "~types/notification"

export const NotificationExamples = () => {
  const { 
    addNotification, 
    showError, 
    showWarning, 
    showInfo, 
    showSuccess 
  } = useNotification()

  // Example 1: Using convenience methods (recommended)
  const handleApiError = () => {
    showError("Connection Failed", "Unable to connect to the backend API")
  }

  const handleValidationWarning = () => {
    showWarning("Validation Warning", "Please check the required fields")
  }

  const handleInfoMessage = () => {
    showInfo("Processing Started", "Your request is being processed...")
  }

  // Example 2: Success notifications (minimized by default)
  const handleSuccessMinimal = () => {
    // This will NOT show because success notifications are minimized
    showSuccess("Task Complete", "Your task has been completed successfully")
  }

  const handleSuccessForced = () => {
    // This WILL show because we force it
    showSuccess("Important Success", "Critical operation completed!", true)
  }

  // Example 3: Using presets for common scenarios
  const handleApiErrorPreset = () => {
    addNotification(NotificationPresets.API_ERROR("Connection timeout"))
  }

  const handleGenerationComplete = () => {
    addNotification(NotificationPresets.GENERATION_COMPLETE("PR Description"))
  }

  const handleProcessingStarted = () => {
    addNotification(NotificationPresets.PROCESSING_STARTED("JIRA Comment"))
  }

  const handleValidationWarningPreset = () => {
    addNotification(NotificationPresets.VALIDATION_WARNING("title"))
  }

  // Example 4: Custom notification with all options
  const handleCustomNotification = () => {
    addNotification({
      type: "info",
      title: "Custom Notification",
      message: "This is a custom notification with specific timing",
      time: 10000, // 10 seconds
      show: true
    })
  }

  return (
    <div className="plasmo-p-4 plasmo-space-y-4">
      <h2 className="plasmo-text-lg plasmo-font-bold">Notification Examples</h2>
      
      <div className="plasmo-space-y-2">
        <h3 className="plasmo-font-semibold">Convenience Methods</h3>
        <button onClick={handleApiError} className="plasmo-btn plasmo-btn-error">
          Show Error
        </button>
        <button onClick={handleValidationWarning} className="plasmo-btn plasmo-btn-warning">
          Show Warning
        </button>
        <button onClick={handleInfoMessage} className="plasmo-btn plasmo-btn-info">
          Show Info
        </button>
      </div>

      <div className="plasmo-space-y-2">
        <h3 className="plasmo-font-semibold">Success Notifications</h3>
        <button onClick={handleSuccessMinimal} className="plasmo-btn plasmo-btn-success">
          Success (Hidden)
        </button>
        <button onClick={handleSuccessForced} className="plasmo-btn plasmo-btn-success">
          Success (Forced)
        </button>
      </div>

      <div className="plasmo-space-y-2">
        <h3 className="plasmo-font-semibold">Preset Notifications</h3>
        <button onClick={handleApiErrorPreset} className="plasmo-btn plasmo-btn-error">
          API Error Preset
        </button>
        <button onClick={handleGenerationComplete} className="plasmo-btn plasmo-btn-success">
          Generation Complete Preset
        </button>
        <button onClick={handleProcessingStarted} className="plasmo-btn plasmo-btn-info">
          Processing Started Preset
        </button>
        <button onClick={handleValidationWarningPreset} className="plasmo-btn plasmo-btn-warning">
          Validation Warning Preset
        </button>
      </div>

      <div className="plasmo-space-y-2">
        <h3 className="plasmo-font-semibold">Custom Notification</h3>
        <button onClick={handleCustomNotification} className="plasmo-btn plasmo-btn-primary">
          Custom Notification
        </button>
      </div>
    </div>
  )
}

/**
 * Migration guide for existing code:
 * 
 * OLD WAY:
 * addNotification({
 *   type: "error",
 *   title: "Error",
 *   message: "Something went wrong"
 * })
 * 
 * NEW WAY (recommended):
 * showError("Error", "Something went wrong")
 * 
 * OR use presets:
 * addNotification(NotificationPresets.API_ERROR("Connection failed"))
 */
