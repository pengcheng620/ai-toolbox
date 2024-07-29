import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import { AddCommentButton } from "~components/jira/add-comment-button"
import {AddDescription} from "~components/github/add-description";





export const config: PlasmoCSConfig = {
  matches: [
    "https://github.com/*/compare/feature/*?expand=1"
  ]
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    console.log("getRootContainer")
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.querySelector(
        "#new_pull_request .Layout-main > div > div:nth-child(2) > div > div:nth-child(2)"
      ) as HTMLElement
      if (rootContainerParent) {
        clearInterval(checkInterval)
        rootContainerParent.classList.add("d-flex")
        rootContainerParent.style.justifyContent = "space-between"
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
  return <AddDescription />
}

export default PlasmoOverlay
