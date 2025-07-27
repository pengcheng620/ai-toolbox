import { SparklesIcon } from "lib/icons/heroicon"
import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"
import { JiraTicketSummaryCheckPanel } from "~components/jira/jira-ticket-summary-panel"

export const config: PlasmoCSConfig = {
  matches: [
    "https://jira.autodesk.com/browse/*"
    // "http://localhost:8887/*"
  ]
}

export const getRootContainer = () =>
  new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const rootContainerParent = document.querySelector(
        "#details-module"
      ).parentElement;
      if (rootContainerParent) {
        console.log("rootContainerParent found", rootContainerParent)
        clearInterval(checkInterval)
        const rootContainer = document.createElement("div")
        rootContainer.className = "module toggle-wrap expanded"
        rootContainer.id = "status-summary-module"
        rootContainerParent.insertBefore(rootContainer, rootContainerParent.firstChild)
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
      <div id="jira-status-summary-heading" className="mod-header">
        <h3 id="jira-status-summary-label" className="toggle-header">
              <button className="aui-button toggle-title" aria-label="People" aria-controls="peoplemodule" aria-expanded="true">
                  <SparklesIcon style={{ width: 16, marginRight: 8 }} />
                  <span className="aui-toggle-header-button-label">Ticket Summary</span>
              </button>
        </h3> 
      </div>
      <div id="jira-status-summary-content" className="mod-content">
        <div id="jira-status-summary-details" className="jira-status-summary-details-panel">
          <JiraTicketSummaryCheckPanel />
        </div>
      </div>
    </>
  )
}

export default PlasmoOverlay
