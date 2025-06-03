export {}

console.log("🎉 AI Toolbox 后台脚本已启动")

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

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 AI Toolbox 扩展已安装/更新")
})

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🎯 Background: 收到消息", {
    message,
    sender: sender.tab ? `tab:${sender.tab.id}` : 'extension',
    timestamp: new Date().toISOString()
  })

  // 处理不同类型的消息
  if (message.name === 'jira') {
    console.log("🎯 Background: 处理Jira消息", message.body)
    handleJiraMessage(message.body).then(result => {
      sendResponse(result)
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      })
    })
    return true // 保持消息通道开放
  }

  if (message.name === 'health') {
    console.log("🎯 Background: 处理健康检查消息")
    handleHealthCheck().then(result => {
      sendResponse(result)
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      })
    })
    return true // 保持消息通道开放
  }

  if (message.name === 'github') {
    console.log("🎯 Background: 处理GitHub消息", message.body)
    handleGitHubMessage(message.body).then(result => {
      sendResponse(result)
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      })
    })
    return true // 保持消息通道开放
  }

  return false
})

// Jira消息处理函数
async function handleJiraMessage(body: any) {
  try {
    const requestBody = { ...body, stream: true }
    
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

    const streamContent = await handleStreamingResponse(response)
    console.log("✅ Background: Jira流式响应完成", streamContent.slice(0, 100) + "...")
    
    const result = { generated_content: streamContent }
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error("❌ Background: Jira错误", error)
    throw error
  }
}

// 健康检查处理函数
async function handleHealthCheck() {
  try {
    console.log("🚀 Background: 调用健康检查API")
    
    const response = await fetch(getApiUrl("/ai/health"))
    
    console.log("📡 Background: 健康检查响应状态", response.status)
    
    if (!response.ok) {
      throw new Error(`健康检查失败: ${response.status}`)
    }
    
    const result = await response.json()
    console.log("✅ Background: 健康检查成功", result)
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error("❌ Background: 健康检查错误", error)
    throw error
  }
}

// GitHub消息处理函数
async function handleGitHubMessage(body: any) {
  try {
    const requestBody = { ...body, stream: true }
    
    console.log("🚀 Background: 调用GitHub API (流式)", requestBody)
    
    const response = await fetch(getApiUrl("/ai/github/generate"), {
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

    const streamContent = await handleStreamingResponse(response)
    console.log("✅ Background: GitHub流式响应完成", streamContent.slice(0, 100) + "...")
    
    const result = { generated_content: streamContent }
    
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error("❌ Background: GitHub错误", error)
    throw error
  }
}

console.log("🎯 Background: 消息处理器已注册") 