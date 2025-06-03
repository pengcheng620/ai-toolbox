import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import { AddCommentButton } from "~components/jira/add-comment-button"
import MessagingTest from "~components/debug/messaging-test"

export const config: PlasmoCSConfig = {
  matches: [
    "https://jira.autodesk.com/*"
    // "http://localhost:8887/*"
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
      <AddCommentButton />
      {/* 添加调试组件 - 仅在开发环境中显示 */}
      {process.env.NODE_ENV === 'development' && <MessagingTest />}
    </>
  )
}

export default PlasmoOverlay
