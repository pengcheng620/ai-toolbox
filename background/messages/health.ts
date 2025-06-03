import type { PlasmoMessaging } from "@plasmohq/messaging"

// API配置
const API_BASE_URL = "http://localhost:8000"
const API_VERSION = "/api/v1"

// 构建完整API URL
function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("🎯 Background: 收到健康检查消息", req.body)
  
  try {
    console.log("🚀 Background: 调用健康检查API")
    
    const response = await fetch(getApiUrl("/ai/health"))
    
    console.log("📡 Background: 健康检查响应状态", response.status)
    
    if (!response.ok) {
      throw new Error(`健康检查失败: ${response.status}`)
    }
    
    const result = await response.json()
    console.log("✅ Background: 健康检查成功", result)
    
    res.send({
      success: true,
      data: result
    })
  } catch (error) {
    console.error("❌ Background: 健康检查错误", error)
    res.send({
      success: false,
      error: error.message
    })
  }
}

export default handler 