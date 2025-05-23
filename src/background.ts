import { sendToContentScript } from "@plasmohq/messaging"

// 处理来自内容脚本的API请求
import type { PlasmoMessaging } from "@plasmohq/messaging"

// API配置
const API_BASE_URL = "http://localhost:8000"
const API_VERSION = "/api/v1"

// 构建完整API URL
function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`
}

// 通用API调用函数
async function callApi(endpoint: string, options: RequestInit = {}) {
  console.log("🚀 Background: API调用", endpoint, options)
  
  try {
    const response = await fetch(getApiUrl(endpoint), {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    console.log("📡 Background: 响应状态", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Background: API错误", errorText)
      throw new Error(`API调用失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("✅ Background: API响应", data)
    return data
  } catch (error) {
    console.error("❌ Background: 请求异常", error)
    throw error
  }
}

// GitHub PR生成处理器
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("🎯 Background: 收到消息", req.name, req.body)
  
  switch (req.name) {
    case "github-pr":
      try {
        const result = await callApi("/ai/github/pr", {
          method: "POST",
          body: JSON.stringify(req.body),
        })
        res.send({
          success: true,
          data: result
        })
      } catch (error) {
        res.send({
          success: false,
          error: error.message
        })
      }
      break

    case "jira-comment":
      try {
        const result = await callApi("/ai/jira/comment", {
          method: "POST", 
          body: JSON.stringify(req.body),
        })
        res.send({
          success: true,
          data: result
        })
      } catch (error) {
        res.send({
          success: false,
          error: error.message
        })
      }
      break

    case "health-check":
      try {
        const result = await callApi("/ai/health")
        res.send({
          success: true,
          data: result
        })
      } catch (error) {
        res.send({
          success: false,
          error: error.message
        })
      }
      break

    default:
      res.send({
        success: false,
        error: `未知的消息类型: ${req.name}`
      })
  }
}

export default handler

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 AI Toolbox 扩展已安装/更新")
}) 