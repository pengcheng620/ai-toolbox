import clsx from "clsx"

// Button state styles
export const getButtonStyles = (loading: boolean, disabled: boolean = false) => {
  return clsx(
    "plasmo-flex plasmo-items-center plasmo-transition-all plasmo-duration-200",
    {
      "plasmo-cursor-not-allowed plasmo-opacity-60": loading || disabled,
      "plasmo-cursor-pointer hover:plasmo-opacity-80": !loading && !disabled,
    }
  )
}

// Modern GitHub button styles
export const getGitHubButtonStyles = (loading: boolean, disabled: boolean = false) => {
  return clsx(
    "plasmo-inline-flex plasmo-items-center plasmo-gap-2 plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-rounded-lg plasmo-border plasmo-transition-all plasmo-duration-200 plasmo-focus:plasmo-outline-none plasmo-focus:plasmo-ring-2 plasmo-focus:plasmo-ring-offset-2",
    {
      // Loading state
      "plasmo-cursor-not-allowed plasmo-opacity-60 plasmo-bg-gray-100 plasmo-text-gray-500 plasmo-border-gray-200": loading || disabled,
      // Normal state
      "plasmo-bg-white plasmo-text-gray-700 plasmo-border-gray-300 hover:plasmo-bg-gray-50 hover:plasmo-border-gray-400 plasmo-focus:plasmo-ring-blue-500 plasmo-shadow-sm": !loading && !disabled,
    }
  )
}

// AI button with gradient styles
export const getAIButtonStyles = (loading: boolean, disabled: boolean = false) => {
  return clsx(
    "plasmo-inline-flex plasmo-items-center plasmo-gap-2 plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-font-medium plasmo-rounded-lg plasmo-border-0 plasmo-transition-all plasmo-duration-200 plasmo-focus:plasmo-outline-none plasmo-focus:plasmo-ring-2 plasmo-focus:plasmo-ring-offset-2 plasmo-shadow-md",
    {
      // Loading state
      "plasmo-cursor-not-allowed plasmo-opacity-60 plasmo-bg-gray-300 plasmo-text-gray-600": loading || disabled,
      // Normal state with gradient
      "plasmo-bg-gradient-to-r plasmo-from-blue-500 plasmo-to-purple-600 plasmo-text-white hover:plasmo-from-blue-600 hover:plasmo-to-purple-700 plasmo-focus:plasmo-ring-blue-400 hover:plasmo-shadow-lg": !loading && !disabled,
    }
  )
}

// Notification styles
export const getNotificationStyles = (type: "info" | "warning" | "error" | "success") => {
  return clsx(
    "plasmo-px-4 plasmo-py-2 plasmo-rounded-lg plasmo-shadow-lg",
    {
      "plasmo-bg-blue-500 plasmo-text-white": type === "info",
      "plasmo-bg-yellow-500 plasmo-text-white": type === "warning", 
      "plasmo-bg-red-500 plasmo-text-white": type === "error",
      "plasmo-bg-green-500 plasmo-text-white": type === "success",
    }
  )
}

// Loading state styles
export const getLoadingStyles = (loading: boolean) => {
  return clsx(
    "plasmo-transition-opacity plasmo-duration-200",
    {
      "plasmo-opacity-60 plasmo-pointer-events-none": loading,
      "plasmo-opacity-100": !loading,
    }
  )
}

// Input field styles
export const getInputStyles = (error: boolean = false, disabled: boolean = false) => {
  return clsx(
    "plasmo-w-full plasmo-px-3 plasmo-py-2 plasmo-rounded-md plasmo-border plasmo-transition-colors",
    {
      "plasmo-border-red-500 plasmo-focus:plasmo-ring-red-500": error,
      "plasmo-border-gray-300 plasmo-focus:plasmo-ring-blue-500": !error,
      "plasmo-bg-gray-100 plasmo-cursor-not-allowed": disabled,
      "plasmo-bg-white": !disabled,
    }
  )
}

// Card styles
export const getCardStyles = (elevated: boolean = false) => {
  return clsx(
    "plasmo-bg-white plasmo-rounded-lg plasmo-border",
    {
      "plasmo-shadow-lg plasmo-border-gray-200": elevated,
      "plasmo-shadow-sm plasmo-border-gray-100": !elevated,
    }
  )
} 