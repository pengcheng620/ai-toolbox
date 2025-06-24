import {
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/16/solid"
import { Notification } from "@mantine/core"
import type { NotificationFactory } from "@mantine/core/lib/components/Notification/Notification"
import type { Styles } from "@mantine/core/lib/core/styles-api/styles-api.types"
import React, { useState, useCallback } from "react"

import type { NotificationConfig } from "~types/notification"





const notificationStyles: Styles<NotificationFactory> = {
  root: {
    width: "320px",
    maxWidth: "90vw",
    transition: "transform 0.3s ease, opacity 0.3s ease",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    borderRadius: "8px",
    "&.fadeout": {
      transform: "translateX(100%)",
      opacity: 0
    }
  },
  title: {
    fontWeight: 600,
    fontSize: "14px"
  },
  description: {
    fontSize: "13px",
    lineHeight: 1.4
  }
}



const notificationTypeMap = {
  info: "blue",
  warning: "yellow",
  error: "red",
  success: "green"
}

const notificationIconMap = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  success: CheckCircleIcon
}

const notificationTimeMap = {
  info: 4000,
  warning: 6000,
  error: 8000,
  success: 2000 // Shorter for success as they should be minimal
}

const generateRandomID = () => {
  return -new Date().getTime()
}

export const AwNotification = () => {
  const { removeNotification, notificationArr } = useNotification()

  // Filter out notifications that should not be shown
  const visibleNotifications = notificationArr.filter(config => config.show !== false)

  return (
    <div className="plasmo-fixed plasmo-right-[20px] plasmo-top-[20px] -plasmo-z-[999999] plasmo-space-y-3">
      {visibleNotifications.map((config, index) => {
        const IconComponent = notificationIconMap[config.type]
        return (
          <Notification
            withCloseButton
            onClose={() => removeNotification(config)}
            key={config.id || index}
            icon={<IconComponent className="plasmo-w-4 plasmo-h-4" />}
            color={notificationTypeMap[config.type]}
            title={config.title}
            styles={notificationStyles}
            className={config.fadeOut ? "fadeout" : ""}>
            {config.message}
          </Notification>
        )
      })}
    </div>
  )
}

const getDefaultNotification = function (type: NotificationConfig["type"] = "info") {
  return {
    id: generateRandomID(),
    time: notificationTimeMap[type],
    title: "Notification",
    message: "Notification",
    type,
    show: true
  } as NotificationConfig
}

// Global notification state to avoid storage quota issues
let globalNotificationState: NotificationConfig[] = []
let globalSetters: Array<(notifications: NotificationConfig[]) => void> = []

export const useNotification = () => {
  const [notificationArr, setNotificationArr] = useState<NotificationConfig[]>(globalNotificationState)

  // Register this component's setter
  React.useEffect(() => {
    globalSetters.push(setNotificationArr)
    return () => {
      globalSetters = globalSetters.filter(setter => setter !== setNotificationArr)
    }
  }, [])

  const updateGlobalState = useCallback((newState: NotificationConfig[]) => {
    globalNotificationState = newState
    globalSetters.forEach(setter => setter(newState))
  }, [])

  const addNotification = useCallback(async (config: NotificationConfig) => {
    // Minimize success notifications - only show if explicitly requested
    if (config.type === "success" && config.show !== true) {
      return // Skip success notifications unless explicitly shown
    }

    const newConfig = { ...getDefaultNotification(config.type), ...config }
    const newState = [...globalNotificationState, newConfig]
    updateGlobalState(newState)

    // Only log errors and critical info
    if (config.type === "error") {
      console.error("Notification Error:", config.title, config.message)
    }

    setTimeout(() => {
      removeNotification(newConfig)
    }, newConfig.time)
  }, [updateGlobalState])

  const removeNotification = useCallback(async (config: NotificationConfig) => {
    // First, mark as fading out
    const fadeOutState = globalNotificationState.map((notification) =>
      notification.id === config.id
        ? { ...notification, fadeOut: true }
        : notification
    )
    updateGlobalState(fadeOutState)

    // Then remove after animation
    setTimeout(() => {
      const filteredState = globalNotificationState.filter(
        (notification) => notification.id !== config.id
      )
      updateGlobalState(filteredState)
    }, 300) // Match the CSS transition duration
  }, [updateGlobalState])

  // Convenience methods for different notification types
  const showError = useCallback((title: string, message: string) => {
    addNotification({ type: "error", title, message })
  }, [addNotification])

  const showWarning = useCallback((title: string, message: string) => {
    addNotification({ type: "warning", title, message })
  }, [addNotification])

  const showInfo = useCallback((title: string, message: string) => {
    addNotification({ type: "info", title, message })
  }, [addNotification])

  const showSuccess = useCallback((title: string, message: string, force = false) => {
    addNotification({ type: "success", title, message, show: force })
  }, [addNotification])

  return {
    notificationArr,
    addNotification,
    removeNotification,
    showError,
    showWarning,
    showInfo,
    showSuccess
  }
}
