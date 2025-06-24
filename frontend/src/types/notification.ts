/**
 * Notification system type definitions
 */

export type NotificationType = "info" | "warning" | "error" | "success"

export interface NotificationConfig {
  /** Unique identifier for the notification */
  id?: number
  /** Duration in milliseconds before auto-removal */
  time?: number
  /** Notification title */
  title?: string
  /** Notification message content */
  message?: string
  /** Internal flag for fade-out animation */
  fadeOut?: boolean
  /** Notification type determining icon and color */
  type: NotificationType
  /** Whether to show this notification (useful for suppressing success notifications) */
  show?: boolean
}

export interface NotificationHookReturn {
  /** Array of current notifications */
  notificationArr: NotificationConfig[]
  /** Add a new notification */
  addNotification: (config: NotificationConfig) => Promise<void>
  /** Remove a specific notification */
  removeNotification: (config: NotificationConfig) => Promise<void>
  /** Show error notification */
  showError: (title: string, message: string) => void
  /** Show warning notification */
  showWarning: (title: string, message: string) => void
  /** Show info notification */
  showInfo: (title: string, message: string) => void
  /** Show success notification (force=true to override minimization) */
  showSuccess: (title: string, message: string, force?: boolean) => void
}

/**
 * Notification configuration presets for common scenarios
 */
export const NotificationPresets = {
  /** API connection errors */
  API_ERROR: (message: string) => ({
    type: "error" as const,
    title: "Connection Failed",
    message: `Unable to connect to API: ${message}`,
    time: 8000
  }),
  
  /** Generation completion */
  GENERATION_COMPLETE: (feature: string) => ({
    type: "success" as const,
    title: "Generation Complete",
    message: `${feature} has been generated successfully`,
    show: false // Minimized by default
  }),
  
  /** Processing started */
  PROCESSING_STARTED: (feature: string) => ({
    type: "info" as const,
    title: "Processing Started",
    message: `${feature} generation in progress...`,
    time: 4000
  }),
  
  /** Validation warnings */
  VALIDATION_WARNING: (field: string) => ({
    type: "warning" as const,
    title: "Validation Warning",
    message: `Please check the ${field} field`,
    time: 6000
  })
} as const
