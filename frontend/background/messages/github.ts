import type { PlasmoMessaging } from "@plasmohq/messaging"

// API配置
const API_BASE_URL = "http://localhost:8000"
const API_VERSION = "/api/v1"

// 构建完整API URL
function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${API_VERSION}${endpoint}`
}

// 处理流式响应
async function handleStreamingResponse(
  res: PlasmoMessaging.Response,
  response: Response
) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error("无法获取响应流")
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    // Send chunk to the client-side
    res.send({ chunk })
  }
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log("🎯 Background: 收到GitHub消息", req.body)

  const { endpoint, ...requestData } = req.body
  const targetEndpoint = endpoint || "/ai/github/pr" // Fallback to old endpoint

  try {
    const requestBody = { ...requestData, stream: true }

    console.log(`🚀 Background: Calling GitHub API at ${targetEndpoint}`, requestBody)

    const response = await fetch(getApiUrl(targetEndpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    console.log(
      `📡 Background: GitHub API response status from ${targetEndpoint}`,
      response.status
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Background: GitHub API error from ${targetEndpoint}`, errorText)
      throw new Error(`API call failed: ${response.status} - ${errorText}`)
    }

    // Handle streaming response by sending chunks back to the requester
    await handleStreamingResponse(res, response)
  } catch (error) {
    console.error(`❌ Background: GitHub error for ${targetEndpoint}`, error)
    // Send a final error message if something goes wrong
    res.send({ error: error.message })
  }
}

export default handler 