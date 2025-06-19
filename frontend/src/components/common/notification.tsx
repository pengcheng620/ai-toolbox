import { XCircleIcon } from "@heroicons/react/16/solid"
import { Notification } from "@mantine/core"
import type { NotificationFactory } from "@mantine/core/lib/components/Notification/Notification"
import type { Styles } from "@mantine/core/lib/core/styles-api/styles-api.types"
import React, { useState, useCallback } from "react"





const notificationStyles: Styles<NotificationFactory> = {
  root: {
    width: "300px",
    transition: "transform 0.5s ease, opacity 0.5s ease",
    "&.fadeout": {
      transform: "translateX(100%)",
      opacity: 0
    }
  }
}

interface NotificationConfig {
  id?: number
  time?: number
  title?: string
  message?: string
  fadeOut?: boolean
  type: "info" | "warning" | "error" | "success"
}

const notificationTypeMap = {
  info: "blue",
  warning: "yellow",
  error: "red",
  success: "green"
}

const generateRandomID = () => {
  return -new Date().getTime()
}

export const AwNotification = () => {
  const { removeNotification, notificationArr } = useNotification()
  return (
    <div className="plasmo-fixed plasmo-right-[20px] plasmo-top-[20px] -plasmo-z-[999999] plasmo-space-y-3">
      {notificationArr.map((config, index) => (
        <Notification
          withCloseButton
          onClose={() => removeNotification(config)}
          key={index}
          icon={<XCircleIcon />}
          color={notificationTypeMap[config.type]}
          title={config.title}
          styles={notificationStyles}
          className={config.fadeOut ? "fadeout" : ""}>
          {config.message}
        </Notification>
      ))}
    </div>
  )
}

const getDefaultNotification = function () {
  return {
    id: generateRandomID(),
    time: 3000,
    title: "Notification",
    message: "Notification",
    type: "info"
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
    const newConfig = { ...getDefaultNotification(), ...config }
    const newState = [...globalNotificationState, newConfig]
    updateGlobalState(newState)

    setTimeout(() => {
      console.log("setTimeout::removeNotification", config.title)
      removeNotification(newConfig)
    }, newConfig.time)
  }, [updateGlobalState])

  const removeNotification = useCallback(async (config: NotificationConfig) => {
    console.log("removeNotification", config)

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
    }, 500) // Match the CSS transition duration
  }, [updateGlobalState])

  return {
    notificationArr,
    addNotification,
    removeNotification
  }
}
