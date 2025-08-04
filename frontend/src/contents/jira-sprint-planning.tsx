import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import { SprintPlanningOverlay } from "~components/jira/sprint-planning-overlay"
import { createSprintPlanningContainer } from "~services/jira-container-manager"

export const config: PlasmoCSConfig = {
  matches: [
    "https://jira.autodesk.com/secure/RapidBoard.jspa?*view=planning.nodetail*"
  ]
}

export const getRootContainer = createSprintPlanningContainer

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({
  createRootContainer
}) => {
  try {
    const rootContainer = await createRootContainer()
    if (rootContainer) {
      const root = createRoot(rootContainer)
      root.render(<SprintPlanningOverlay />)
    }
  } catch (error) {
    console.error("Sprint Planning: Failed to render:", error)
  }
}

export default SprintPlanningOverlay
