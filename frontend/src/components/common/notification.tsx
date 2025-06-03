import { XCircleIcon } from "@heroicons/react/16/solid"
import { Notification } from "@mantine/core"
import type { NotificationFactory } from "@mantine/core/lib/components/Notification/Notification"
import type { Styles } from "@mantine/core/lib/core/styles-api/styles-api.types"
import React from "react"

import { useStorage } from "@plasmohq/storage/hook"





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
  type: "info" | "warning" | "error"
}

const notificationTypeMap = {
  info: "blue",
  warning: "yellow",
  error: "red"
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

export const useNotification = () => {
  const [notificationArr, setNotificationArr] = useStorage<
    NotificationConfig[]
  >("aw_notification", [])

  const addNotification = async (config: NotificationConfig) => {
    const newConfig = { ...getDefaultNotification(), ...config }
    setNotificationArr((prev) => [...prev, newConfig])
    setTimeout(() => {
      console.log("setTimeout::removeNotification", config.title)
      removeNotification(newConfig)
    }, newConfig.time)
  }

  const removeNotification = async (config: NotificationConfig) => {
    console.log("removeNotification", config)
    setNotificationArr((prev) =>
      prev.map((notification) =>
        notification.id === config.id
          ? { ...notification, fadeOut: true }
          : notification
      )
    )
    setTimeout(() => {
      setNotificationArr((prev) =>
        prev.filter((notification) => notification.id !== config.id)
      )
    }, 500) // Match the CSS transition duration
  }
  return {
    notificationArr,
    addNotification,
    removeNotification
  }
}
