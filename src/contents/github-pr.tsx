import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import { AddCommentButton } from "~components/jira/add-comment-button"





export const config: PlasmoCSConfig = {
  matches: [
    "https://github.com/*/pull/*",
    // "http://localhost:8887/*"
  ]
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    console.log("getRootContainer")
    const checkInterval = setInterval(() => {
      // const rootContainerParent = document.querySelector(".timeline-comment-header > .timeline-comment-actions > details > details-menu")
      // if (rootContainerParent) {
      //   clearInterval(checkInterval)
      //   const rootContainer = document.createElement("div")
      //   rootContainer.className = "aui-buttons pluggable-ops"
      //   rootContainerParent.append(rootContainer)
      //   resolve(rootContainer)
      // }
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
  return <AddCommentButton />
}

export default PlasmoOverlay