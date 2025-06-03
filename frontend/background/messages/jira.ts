import type { PlasmoMessaging } from "@plasmohq/messaging"

// 添加启动日志
console.log("🎯 Jira消息处理器已加载")

// API配置
const API_BASE_URL = "http://localhost:8000"
const API_VERSION = "/api/v1"

// 构建完整API URL
function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`
}

// 处理流式响应
async function handleStreamingResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  
  if (!reader) {
    throw new Error('无法获取响应流')
  }
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          return fullContent
        }
        fullContent += data
      }
    }
  }
  
  return fullContent
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("🎯 Background: 收到Jira消息", req.body)
  console.log("🎯 Background: 消息处理器被调用，时间戳:", new Date().toISOString())
  
  try {
    // 确保请求体包含stream参数
    const requestBody = { ...req.body, stream: true }
    
    console.log("🚀 Background: 调用Jira API (流式)", requestBody)
    
    const response = await fetch(getApiUrl("/ai/jira/generate"), {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log("📡 Background: Jira API响应状态", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Background: Jira API错误", errorText)
      throw new Error(`API调用失败: ${response.status} - ${errorText}`)
    }

    // 处理流式响应
    const streamContent = await handleStreamingResponse(response)
    console.log("✅ Background: Jira流式响应完成", streamContent.slice(0, 100) + "...")
    
    const result = { generated_content: streamContent }
    
    res.send({
      success: true,
      data: result
    })
  } catch (error) {
    console.error("❌ Background: Jira错误", error)
    res.send({
      success: false,
      error: error.message
    })
  }
}

// 添加导出日志
console.log("🎯 Jira消息处理器导出完成")

export default handler 