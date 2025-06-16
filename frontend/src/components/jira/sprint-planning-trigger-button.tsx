import React from "react"

interface SprintPlanningTriggerButtonProps {
  onClick: () => void
}

export const SprintPlanningTriggerButton: React.FC<SprintPlanningTriggerButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="aui-button aui-button-primary"
      style={{
        backgroundColor: "#0052CC",
        color: "white",
        border: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "background-color 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#0065FF"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#0052CC"
      }}
      title="Open Sprint Planning Assistant to analyze current sprint data, team workload, and get AI-powered recommendations for optimizing your sprint planning process."
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
      Sprint Planning Assistant
    </button>
  )
} 