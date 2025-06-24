/**
 * Test file for the optimized notification system
 * This file can be used to manually test notification functionality
 */

import React from "react"
import { useNotification } from "~components/common/notification"
import { NotificationPresets } from "~types/notification"

export const NotificationTest = () => {
  const { 
    showError, 
    showWarning, 
    showInfo, 
    showSuccess,
    addNotification 
  } = useNotification()

  const testBasicNotifications = () => {
    console.log("Testing basic notifications...")
    
    // Test error notification
    showError("Test Error", "This is a test error message with proper red styling and error icon")
    
    setTimeout(() => {
      // Test warning notification
      showWarning("Test Warning", "This is a test warning message with yellow styling and warning icon")
    }, 1000)
    
    setTimeout(() => {
      // Test info notification
      showInfo("Test Info", "This is a test info message with blue styling and info icon")
    }, 2000)
    
    setTimeout(() => {
      // Test success notification (minimized by default)
      showSuccess("Test Success (Hidden)", "This success notification should NOT appear")
    }, 3000)
    
    setTimeout(() => {
      // Test forced success notification
      showSuccess("Test Success (Forced)", "This success notification SHOULD appear because it's forced", true)
    }, 4000)
  }

  const testPresetNotifications = () => {
    console.log("Testing preset notifications...")
    
    // Test API error preset
    addNotification(NotificationPresets.API_ERROR("Connection timeout after 5 seconds"))
    
    setTimeout(() => {
      // Test processing started preset
      addNotification(NotificationPresets.PROCESSING_STARTED("PR Description"))
    }, 1500)
    
    setTimeout(() => {
      // Test validation warning preset
      addNotification(NotificationPresets.VALIDATION_WARNING("email address"))
    }, 3000)
    
    setTimeout(() => {
      // Test generation complete preset (should be hidden)
      addNotification(NotificationPresets.GENERATION_COMPLETE("JIRA Comment"))
    }, 4500)
  }

  const testCustomNotification = () => {
    console.log("Testing custom notification...")
    
    addNotification({
      type: "info",
      title: "Custom Notification",
      message: "This is a custom notification with extended duration and specific settings",
      time: 10000, // 10 seconds
      show: true
    })
  }

  const testNotificationTypes = () => {
    console.log("Testing all notification types with icons...")
    
    const types = [
      { type: "error" as const, title: "Error Test", message: "Red notification with X circle icon" },
      { type: "warning" as const, title: "Warning Test", message: "Yellow notification with exclamation triangle icon" },
      { type: "info" as const, title: "Info Test", message: "Blue notification with information circle icon" },
      { type: "success" as const, title: "Success Test", message: "Green notification with check circle icon", show: true }
    ]
    
    types.forEach((notification, index) => {
      setTimeout(() => {
        addNotification(notification)
      }, index * 800)
    })
  }

  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "Arial, sans-serif",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h1>Notification System Test</h1>
      <p>Use the buttons below to test different notification types and features.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
        <button 
          onClick={testBasicNotifications}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Test Basic Notifications (Error, Warning, Info, Success)
        </button>
        
        <button 
          onClick={testPresetNotifications}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Test Preset Notifications
        </button>
        
        <button 
          onClick={testCustomNotification}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Test Custom Notification
        </button>
        
        <button 
          onClick={testNotificationTypes}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6f42c1",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Test All Notification Types with Icons
        </button>
      </div>
      
      <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "5px" }}>
        <h3>Test Instructions:</h3>
        <ul>
          <li><strong>Basic Notifications:</strong> Tests the convenience methods with proper timing</li>
          <li><strong>Preset Notifications:</strong> Tests predefined notification configurations</li>
          <li><strong>Custom Notification:</strong> Tests custom configuration with extended duration</li>
          <li><strong>All Types with Icons:</strong> Verifies that each type shows the correct icon and color</li>
        </ul>
        
        <h3>Expected Behavior:</h3>
        <ul>
          <li>Error notifications should be red with X circle icon</li>
          <li>Warning notifications should be yellow with exclamation triangle icon</li>
          <li>Info notifications should be blue with information circle icon</li>
          <li>Success notifications should be green with check circle icon (when forced)</li>
          <li>Success notifications should be hidden by default unless forced</li>
          <li>Notifications should auto-dismiss after their specified duration</li>
          <li>Only error messages should appear in console logs</li>
        </ul>
      </div>
    </div>
  )
}

export default NotificationTest
