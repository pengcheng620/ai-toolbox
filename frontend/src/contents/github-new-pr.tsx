import mantineCssText from "data-text:@mantine/core/styles.css"
import cssText from "data-text:~style.css"
import type {
  PlasmoCSConfig,
  PlasmoCSUIJSXContainer,
  PlasmoRender
} from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import { GenerateDoDefinitionButton } from "~components/jira/add-comment-button"
import {AddDescription} from "~components/github/add-description"
import { ThemeProvider } from "~theme"

import "@mantine/core/styles.css"





export const config: PlasmoCSConfig = {
  matches: [
    "https://github.com/*/compare/feature/*?expand=1"
  ]
}

// Essential Tailwind classes with plasmo- prefix for Content Scripts UI
const getTailwindClasses = () => `
  .plasmo-w-4 { width: 1rem !important; }
  .plasmo-h-4 { height: 1rem !important; }
  .plasmo-text-blue-600 {
    --tw-text-opacity: 1 !important;
    color: rgb(37 99 235 / var(--tw-text-opacity)) !important;
  }
  .plasmo-hidden { display: none !important; }
  .plasmo-flex { display: flex !important; }
  .plasmo-inline-flex { display: inline-flex !important; }
  .plasmo-items-center { align-items: center !important; }
  .plasmo-justify-center { justify-content: center !important; }
  .plasmo-mr-2 { margin-right: 0.5rem !important; }
  .plasmo-ml-2 { margin-left: 0.5rem !important; }
  .plasmo-text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
  .plasmo-font-medium { font-weight: 500 !important; }
  .plasmo-rounded { border-radius: 0.25rem !important; }
  .plasmo-bg-blue-50 {
    --tw-bg-opacity: 1 !important;
    background-color: rgb(239 246 255 / var(--tw-bg-opacity)) !important;
  }
  .plasmo-text-gray-500 {
    --tw-text-opacity: 1 !important;
    color: rgb(107 114 128 / var(--tw-text-opacity)) !important;
  }
  .plasmo-transition {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter !important;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
    transition-duration: 150ms !important;
  }
`

// Inject Tailwind styles globally for Mantine Popover components
const injectGlobalStyles = () => {
  const globalStyleId = 'plasmo-tailwind-global-styles'

  // Check if styles are already injected
  if (document.getElementById(globalStyleId)) {
    return
  }

  const globalStyle = document.createElement("style")
  globalStyle.id = globalStyleId
  globalStyle.textContent = getTailwindClasses()
  document.head.appendChild(globalStyle)
}

export const getStyle = () => {
  // Inject global styles for Mantine Popover components
  injectGlobalStyles()

  const style = document.createElement("style")
  const tailwindClasses = getTailwindClasses()

  // Include Mantine styles, Tailwind classes, and our custom styles for Shadow DOM
  style.textContent = mantineCssText + tailwindClasses + cssText
  return style
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
  return (
    <ThemeProvider>
      <AddDescription />
    </ThemeProvider>
  )
}

export default PlasmoOverlay
