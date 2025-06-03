import type { PlasmoMessaging } from "@plasmohq/messaging"

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
  console.log("🎯 Background: 收到GitHub消息", req.body)
  
  try {
    // 确保请求体包含stream参数
    const requestBody = { ...req.body, stream: true }
    
    console.log("🚀 Background: 调用GitHub API (流式)", requestBody)
    
    const response = await fetch(getApiUrl("/ai/github/pr"), {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log("📡 Background: GitHub API响应状态", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Background: GitHub API错误", errorText)
      throw new Error(`API调用失败: ${response.status} - ${errorText}`)
    }

    // 处理流式响应
    const streamContent = await handleStreamingResponse(response)
    console.log("✅ Background: GitHub流式响应完成", streamContent.slice(0, 100) + "...")
    
    const result = { generated_description: streamContent }
    
    res.send({
      success: true,
      data: result
    })
  } catch (error) {
    console.error("❌ Background: GitHub错误", error)
    res.send({
      success: false,
      error: error.message
    })
  }
}

export default handler 