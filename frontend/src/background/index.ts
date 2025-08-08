/**
 * 🎯 AI Toolbox Background Service Worker
 */

import { handleStreamRequest, validateRequestData } from './handlers/base'
import { isValidServiceAction } from '~/config/streaming'

export {}

console.log("🚀 AI Toolbox Background Worker started - Simplified Architecture")

// Extension installation event
chrome.runtime.onInstalled.addListener(() => {
  console.log("🎉 AI Toolbox extension installed/updated")
})

/**
 * 🔧 Auto routing - no need to manually register handlers!
 * 基于端口名约定：service-action 格式自动路由到对应处理器
 */
chrome.runtime.onConnect.addListener((port) => {
  // 🔧 过滤Plasmo内部端口，避免干扰日志
  if (port.name.startsWith('__plasmo_')) {
    // Plasmo内部端口，静默处理
    return
  }
  
  // 解析端口名：service-action 格式
  const portParts = port.name.split('-')
  
  if (portParts.length < 2) {
    console.warn(`❌ Invalid port name format: ${port.name}. Expected: service-action`)
    port.disconnect()
    return
  }
  
  const service = portParts[0]
  const action = portParts.slice(1).join('-') // 支持多段action名称
  
  // 验证service和action是否支持
  if (!isValidServiceAction(service, action)) {
    console.warn(`❌ Unsupported service/action: ${service}/${action}`)
    port.postMessage({ 
      type: 'error', 
      error: `不支持的服务或操作: ${service}/${action}` 
    })
    port.disconnect()
    return
  }
  
  console.log(`🔌 Port connected: ${port.name} -> ${service}/${action}`)
  
  // 设置消息监听器
  port.onMessage.addListener((request) => {
    if (request.type === 'execute') {
      // 🔧 请求数据验证
      const validation = validateRequestData(service, action, request.data)
      if (!validation.valid) {
        console.warn(`❌ Invalid request data for ${service}/${action}:`, validation.error)
        port.postMessage({ 
          type: 'error', 
          error: `请求参数错误: ${validation.error}` 
        })
        return
      }
      
      // 🚀 统一处理所有流式请求
      handleStreamRequest(port, service, action, request.data)
        .catch(error => {
          console.error(`❌ Stream request failed for ${service}/${action}:`, error)
          port.postMessage({ 
            type: 'error', 
            error: `处理请求时发生错误: ${error.message}` 
          })
        })
    } else {
      console.warn(`❌ Unknown request type: ${request.type}`)
      port.postMessage({ 
        type: 'error', 
        error: `未知的请求类型: ${request.type}` 
      })
    }
  })
  
  // 端口断开监听
  port.onDisconnect.addListener(() => {
    console.log(`🔌 Port disconnected: ${port.name}`)
    if (chrome.runtime.lastError) {
      console.warn(`⚠️ Port disconnect error:`, chrome.runtime.lastError.message)
    }
  })
})

// Service Worker keep-alive mechanism
// 防止长时间操作时Service Worker被挂起
let keepAliveInterval: NodeJS.Timeout | null = null

const startKeepAlive = () => {
  if (keepAliveInterval) return
  
  keepAliveInterval = setInterval(() => {
    // 通过访问chrome.runtime保持活跃
    chrome.runtime.id
  }, 25000) // 每25秒
  
  console.log("🔄 Service Worker keep-alive started")
}

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
    console.log("🔄 Service Worker keep-alive stopped")
  }
}

// 启动保活机制
startKeepAlive()

console.log("✅ Background Worker initialized with auto-routing")