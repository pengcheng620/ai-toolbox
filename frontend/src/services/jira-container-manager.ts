/**
 * Jira Container Manager
 * 处理在 JIRA 页面中创建和管理 DOM 容器的逻辑
 */

// Helper function to create fallback container
export const createFallbackContainer = (resolve: (container: HTMLElement) => void) => {
  try {
    // Fallback: create floating container
    const rootContainer = document.createElement("div")
    rootContainer.className = "sprint-planning-assistant-fallback"
    rootContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 4px;
      width: 320px;
      max-height: 80vh;
      overflow-y: auto;
    `

    // Ensure document.body exists
    if (document.body) {
      document.body.appendChild(rootContainer)
      resolve(rootContainer)
    } else {
      // Wait for body to be available
      const bodyCheckInterval = setInterval(() => {
        if (document.body) {
          clearInterval(bodyCheckInterval)
          document.body.appendChild(rootContainer)
          resolve(rootContainer)
        }
      }, 100)
      
      // Timeout for body check
      setTimeout(() => {
        clearInterval(bodyCheckInterval)
        console.error("Sprint Planning: document.body not available")
        resolve(rootContainer) // Return container anyway
      }, 5000)
    }
  } catch (error) {
    console.error("Sprint Planning: Failed to create fallback container:", error)
    // Create minimal container as last resort
    const minimalContainer = document.createElement("div")
    resolve(minimalContainer)
  }
}

/**
 * 创建 Sprint Planning 根容器
 * 按优先级尝试不同的容器位置
 */
export const createSprintPlanningContainer = () =>
  new Promise<HTMLElement>((resolve) => {
    const checkInterval = setInterval(() => {
      try {
        // Try to find .ghx-controls element to insert before it
        const ghxControls = document.querySelector(".ghx-controls")
        if (ghxControls?.parentNode) {
          clearInterval(checkInterval)

          // Create our container
          const rootContainer = document.createElement("div")
          rootContainer.className = "sprint-planning-assistant-container"
          rootContainer.style.cssText = `
            width: 100%;
            margin-bottom: 12px;
            display: block;
          `

          // Insert before .ghx-controls
          ghxControls.parentNode.insertBefore(rootContainer, ghxControls)
          resolve(rootContainer)
          return
        }

        // Fallback: try other containers in Jira board/backlog pages
        const containers = [
          // Backlog page toolbar
          "#subnav-title",
          ".aui-toolbar2-primary",
          // Board page toolbar
          "#ghx-board-toolbar",
          ".ghx-controls-plan",
          // Fallback to general toolbar
          ".toolbar-split-left",
          ".aui-toolbar"
        ]

        for (const selector of containers) {
          const element = document.querySelector(selector)
          const containerParent = element?.parentNode
          if (containerParent) {
            clearInterval(checkInterval)

            // Create our container
            const rootContainer = document.createElement("div")
            rootContainer.className = "sprint-planning-assistant-container"
            rootContainer.style.cssText = `
              width: 100%;
              margin: 10px 0;
              display: block;
            `

            containerParent.appendChild(rootContainer)
            resolve(rootContainer)
            return
          }
        }
      } catch (error) {
        console.error("Sprint Planning: Error during container search:", error)
        clearInterval(checkInterval)
        createFallbackContainer(resolve)
        return
      }
    }, 200) // Check more frequently for better responsiveness

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval)
      console.warn("Sprint Planning: Could not find suitable container, creating fallback")
      createFallbackContainer(resolve)
    }, 10000)
  }) 