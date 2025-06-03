import mantineCssText from "data-text:@mantine/core/styles.css"
import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

import { ThemeProvider } from "~theme"

import "@mantine/core/styles.css"

import type { NotificationFactory } from "@mantine/core/lib/components/Notification/Notification"
import type { Styles } from "@mantine/core/lib/core/styles-api/styles-api.types"
import React from "react"

import { AwNotification } from "~components/common/notification"

import { setMantineColorScheme } from "../../lib/utils"


export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText + mantineCssText
  return style
}

const notificationStyles: Styles<NotificationFactory> = {
  root: {
    position: "fixed",
    top: "20px",
    right: "20px",
    width: "300px",
    zIndex: 9999
  }
}

const PlasmoOverlay = () => {
  setMantineColorScheme("light")
  return (
    <ThemeProvider>
      <AwNotification />
    </ThemeProvider>
  )
}

export default PlasmoOverlay
