import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

// import { GenerateDoDefinitionButton } from "~components/jira/add-comment-button"
import { GenerateTicketSummaryButton } from "~components/jira/ticket-summary-button"

export const config: PlasmoCSConfig = {
  matches: [
    "https://jira.autodesk.com/browse/*"
  ]
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.querySelector(
        "#opsbar-opsbar-transitions"
      ).parentNode
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
    <>
      {/* <GenerateDoDefinitionButton /> */}
      <GenerateTicketSummaryButton />
    </>
  )
}

export default PlasmoOverlay
