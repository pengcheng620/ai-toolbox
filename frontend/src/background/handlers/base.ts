// 🎯 AI Toolbox Background generic streaming request handler
// Simplified architecture - handle all streaming API requests

import { getApiConfigSync } from 'lib/config/api-config'
import { getEndpoint } from '~/config/streaming'

/**
 * 🚀 Generic streaming request handler
 * Support any service/action combination, dynamically get endpoint configuration
 * 
 * @param port - Chrome Runtime Port
 * @param service - Service name (e.g. 'jira', 'github')
 * @param action - Action name (e.g. 'ticket-summary', 'message-optimize')
 * @param requestData - Request data
 */
export async function handleStreamRequest(
  port: chrome.runtime.Port,
  service: string,
  action: string,
  requestData: any
): Promise<void> {
  const requestId = `${service}/${action}`
  
  try {
    // 🔧 Dynamically get endpoint configuration
    const endpoint = getEndpoint(service as any, action)
    const config = getApiConfigSync()
    
    const fullUrl = `${config.baseUrl}/api/v1${endpoint}`
    const requestPayload = { ...requestData, stream: true }
    console.log(`[${requestId}] Starting stream request to: ${fullUrl}`)
    console.log(`[${requestId}] Request payload:`, JSON.stringify(requestPayload, null, 2))
    
    // Start streaming request (reference existing implementation, no API Key)
    const response = await fetch(`${config.baseUrl}/api/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Explicitly specify accepting SSE stream
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body received')
    }

    // 🔧 Streaming data processing
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '' // Buffer handling incomplete SSE data

    console.log(`[${requestId}] Stream connection established`)

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log(`[${requestId}] Stream completed`)
        port.postMessage({ type: 'done' })
        break
      }

      // Add new data to buffer
      buffer += decoder.decode(value, { stream: true })
      
      // 🔧 Improved SSE parsing - handle cross-chunk data
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep last line (possibly incomplete)
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6) // Remove 'data: ' prefix
          
          // Check end marker
          if (data === '[DONE]') {
            console.log(`[${requestId}] Stream completed with [DONE] marker`)
            port.postMessage({ type: 'done' })
            return
          }
          
          // 🔧 Fix line break problem: handle encoded line breaks and send all data (including empty data)
          let decodedData = data
          if (data.includes('\\n')) {
            decodedData = data.replace(/\\n/g, '\n')
          }
          
          // Critical fix: always send data, even if it's empty (possibly line breaks)
          port.postMessage({ type: 'chunk', data: decodedData })
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown streaming error'
    console.error(`[${requestId}] Stream error:`, errorMsg)
    
    // Send error message to frontend
    port.postMessage({ 
      type: 'error', 
      error: `${service}服务请求失败: ${errorMsg}` 
    })
  }
}

/**
 * 🔧 Tool function: validate request data
 * Can add specific validation logic for different service/action
 */
export function validateRequestData(
  service: string, 
  action: string, 
  data: any
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request data must be an object' }
  }
  
  // Jira specific validation
  if (service === 'jira') {
    switch (action) {
      case 'ticket-summary':
      case 'status-check':
        if (!data.issue_key) {
          return { valid: false, error: 'issue_key is required for Jira operations' }
        }
        break
      case 'message-optimize':
        if (!data.issue_key) {
          return { valid: false, error: 'issue_key is required for message optimization' }
        }
        if (!data.message_to_optimize) {
          return { valid: false, error: 'message_to_optimize is required for message optimization' }
        }
        break
    }
  }
  
  // GitHub specific validation
  if (service === 'github') {
    switch (action) {
      case 'pr-description':
        if (!data.pr_url && !data.pr_number) {
          return { valid: false, error: 'pr_url or pr_number is required for GitHub operations' }
        }
        break
    }
  }
  
  return { valid: true }
}