import cssText from "data-text:~style.css"
import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"
import { AddDescriptionDemo } from "~components/github"
import { AddDescription } from "~components/github/add-description"

import { GenerateDoDefinitionButton } from "~components/jira/add-comment-button"





export const config: PlasmoCSConfig = {
  matches: [
    "https://github.com/*/pull/*",
    // "http://localhost:8887/*"
    "https://git.autodesk.com/*/pull/*"

  ]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    console.log("getRootContainer")
    const checkInterval = setInterval(() => {
      console.log("checkInterval")
      // const rootContainerParent = document.querySelector("div.tabnav.comment-form-head");
      // if (rootContainerParent) {
      //   clearInterval(checkInterval)
      //   const rootContainer = document.createElement("div")
      //   rootContainer.className = "aui-buttons pluggable-ops"
      //   rootContainerParent.append(rootContainer)
      //   resolve(rootContainer)
      // }
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
  return <AddDescription />
  // return <AddDescriptionDemo />
}

export default PlasmoOverlay
