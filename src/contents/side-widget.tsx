import mantineCssText from "data-text:@mantine/core/styles.css"
import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

import { ThemeProvider } from "~theme"

import "@mantine/core/styles.css"

import React from "react"

import SideWidgetContainer from "~components/side-widget/container"

import { setMantineColorScheme } from "../../lib/utils"


export const config: PlasmoCSConfig = {
  matches: ["https://jira.autodesk.com/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText + mantineCssText
  return style
}

const PlasmoOverlay = () => {
  setMantineColorScheme("light")
  return (
    <ThemeProvider>
      <SideWidgetContainer />
    </ThemeProvider>
  )
}

export default PlasmoOverlay
