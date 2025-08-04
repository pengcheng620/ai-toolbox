/**
 * Plasmo官方消息传递工具函数
 * 使用@plasmohq/messaging包进行Content Script与Background Script之间的通信
 */

import { sendToBackground } from "@plasmohq/messaging"

export interface MessageResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 健康检查消息传递
 */
export async function sendHealthCheck(): Promise<MessageResponse> {
  console.log("🚀 Sending health check message to background script (Plasmo)")
  try {
    const response = await (sendToBackground as any)({
      name: "health"
    })
    console.log("✅ Health check response received:", response)
    return response
  } catch (error) {
    console.error("❌ Health check failed:", error)
    throw error
  }
}

/**
 * Jira API消息传递
 */
export async function sendJiraMessage(body: any): Promise<MessageResponse> {
  console.log("🚀 Sending Jira message to background script (Plasmo):", body)
  try {
    const response = await (sendToBackground as any)({
      name: "jira",
      body
    })
    console.log("✅ Jira response received:", response)
    return response
  } catch (error) {
    console.error("❌ Jira message failed:", error)
    throw error
  }
}

/**
 * GitHub API消息传递
 */
export async function sendGitHubMessage(body: any): Promise<MessageResponse> {
  console.log("🚀 Sending GitHub message to background script (Plasmo):", body)
  try {
    const response = await (sendToBackground as any)({
      name: "github",
      body
    })
    console.log("✅ GitHub response received:", response)
    return response
  } catch (error) {
    console.error("❌ GitHub message failed:", error)
    throw error
  }
}