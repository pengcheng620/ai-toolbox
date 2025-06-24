import mantineCssText from "data-text:@mantine/core/styles.css"
import cssText from "data-text:~style.css"
import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"
import { AddDescription } from "~components/github/add-description"

import { ThemeProvider } from "~theme"

import "@mantine/core/styles.css"


export const config: PlasmoCSConfig = {
  matches: [
    "https://github.com/*/pull/*",
    "https://git.autodesk.com/*/pull/\d+$"
  ]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = mantineCssText + cssText
  return style
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    console.log("getRootContainer")
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.querySelector(".timeline-comment-header > .timeline-comment-actions > details > details-menu")
      if (rootContainerParent) {
        clearInterval(checkInterval)
        const rootContainer = document.createElement("div")
        rootContainer.className = "aui-buttons pluggable-ops"
        rootContainerParent.append(rootContainer)
        resolve(rootContainer)
      }
    }, 137)
  })

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({
  createRootContainer
}) => {
  const rootContainer = await createRootContainer()
  const root = createRoot(rootContainer)
  root.render(<PlasmoOverlay />)
}

const PlasmoOverlay = () => {
  return (
    <ThemeProvider>
      <AddDescription />
    </ThemeProvider>
  )
  // return <AddDescriptionDemo />
}

export default PlasmoOverlay
