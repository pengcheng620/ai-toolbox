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
      // Look for the first timeline-comment-header and insert before timeline-comment-actions
      const timelineCommentHeader = document.querySelector(".timeline-comment-header")
      const timelineCommentActions = timelineCommentHeader?.querySelector(".timeline-comment-actions")

      if (timelineCommentHeader && timelineCommentActions) {
        clearInterval(checkInterval)
        const rootContainer = document.createElement("div")
        rootContainer.className = "aui-buttons pluggable-ops"
        rootContainer.style.cssText = "display: inline-flex; align-items: center; margin-right: 8px;"

        // Insert before timeline-comment-actions
        timelineCommentHeader.insertBefore(rootContainer, timelineCommentActions)
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
