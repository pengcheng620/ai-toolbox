import clsx from "clsx"

// 按钮状态样式
export const getButtonStyles = (loading: boolean, disabled: boolean = false) => {
  return clsx(
    "plasmo-flex plasmo-items-center plasmo-transition-all plasmo-duration-200",
    {
      "plasmo-cursor-not-allowed plasmo-opacity-60": loading || disabled,
      "plasmo-cursor-pointer hover:plasmo-opacity-80": !loading && !disabled,
    }
  )
}

// 通知样式
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

// 加载状态样式
export const getLoadingStyles = (loading: boolean) => {
  return clsx(
    "plasmo-transition-opacity plasmo-duration-200",
    {
      "plasmo-opacity-60 plasmo-pointer-events-none": loading,
      "plasmo-opacity-100": !loading,
    }
  )
}

// 输入框样式
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

// 卡片样式
export const getCardStyles = (elevated: boolean = false) => {
  return clsx(
    "plasmo-bg-white plasmo-rounded-lg plasmo-border",
    {
      "plasmo-shadow-lg plasmo-border-gray-200": elevated,
      "plasmo-shadow-sm plasmo-border-gray-100": !elevated,
    }
  )
} 