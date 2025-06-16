import React, { useState, useEffect } from "react"
import { SprintPlanningWidget } from "~components/sprint-planning/SprintPlanningWidget"
import { SprintPlanningTriggerButton } from "./sprint-planning-trigger-button"

export const SprintPlanningOverlay = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isJiraBoardPage, setIsJiraBoardPage] = useState(false)

  useEffect(() => {
    // Check if we're on a Jira board or backlog page
    const checkPage = () => {
      try {
        const url = window.location.href
        const isBoardPage = url.includes('RapidBoard.jspa') || 
                           url.includes('/boards/') ||
                           url.includes('/backlog') ||
                           url.includes('view=planning')
        
        setIsJiraBoardPage(isBoardPage)
        
        // Auto-show on backlog pages
        if (url.includes('/backlog') || url.includes('view=planning')) {
          setIsVisible(true)
        }
      } catch (error) {
        console.error("Sprint Planning: Error checking page:", error)
      }
    }

    // Initial check
    checkPage()

    // Listen for URL changes (SPA navigation)
    const handleUrlChange = () => {
      setTimeout(checkPage, 500) // Small delay for page to update
    }

    // Listen for pushstate/popstate events
    window.addEventListener('popstate', handleUrlChange)
    
    // Override pushState to detect programmatic navigation
    const originalPushState = history.pushState
    history.pushState = function(...args) {
      try {
        originalPushState.apply(history, args)
        handleUrlChange()
      } catch (error) {
        console.error("Sprint Planning: Error in pushState override:", error)
      }
    }

    return () => {
      try {
        window.removeEventListener('popstate', handleUrlChange)
        history.pushState = originalPushState
      } catch (error) {
        console.error("Sprint Planning: Error in cleanup:", error)
      }
    }
  }, [])

  // Don't render anything if not on a Jira board page
  if (!isJiraBoardPage) {
    return null
  }

  return (
    <>
      {!isVisible ? (
        <SprintPlanningTriggerButton onClick={() => setIsVisible(true)} />
      ) : (
        <SprintPlanningWidget 
          onClose={() => setIsVisible(false)}
          onRefresh={() => {
            // Refresh logic will be handled by the widget
            console.log("Sprint Planning: Refresh requested")
          }}
        />
      )}
    </>
  )
} 