// 🎯 AI Toolbox 通用流式处理Hook基础
// 简化架构 - 统一的流式数据处理逻辑

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * 流式处理状态接口
 */
interface StreamState {
  data: string          // 累积的流式数据
  loading: boolean      // 加载状态
  error: string | null  // 错误信息
}

/**
 * 流式处理选项接口
 */
interface StreamOptions {
  onChunk?: (fullText: string) => void      // 实时数据回调
  onComplete?: (finalText: string) => void  // 完成回调
  onError?: (error: string) => void         // 错误回调
}

/**
 * Port消息类型定义
 */
interface PortMessage {
  type: 'chunk' | 'done' | 'error'
  data?: string
  error?: string
}

/**
 * 发送给Background的请求消息
 */
interface PortRequest {
  type: 'execute'
  service: string
  action: string
  data: any
}

/**
 * 🚀 通用流式处理Hook
 * 
 * @param service - 服务名称 (如: 'jira', 'github')  
 * @param action - 动作名称 (如: 'ticket-summary', 'message-optimize')
 * @returns 流式处理状态和执行函数
 */
export function useStreamBase(service: string, action: string) {
  const [state, setState] = useState<StreamState>({
    data: '',
    loading: false,
    error: null
  })
  
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const portName = `${service}-${action}` // 🎯 约定：service-action格式
  
  // 🔧 自动清理 - 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (portRef.current) {
        try {
          portRef.current.disconnect()
        } catch (error) {
          // 忽略已断开连接的错误
          console.debug(`Port ${portName} already disconnected`)
        }
        portRef.current = null
      }
    }
  }, [portName])
  
  /**
   * 执行流式请求
   */
  const execute = useCallback(async (request: any, options: StreamOptions = {}) => {
    // 清理之前的连接
    if (portRef.current) {
      try {
        portRef.current.disconnect()
      } catch (error) {
        // 忽略已断开连接的错误
        console.debug(`Previous port ${portName} already disconnected`)
      }
    }
    
    // 初始化状态
    setState({ data: '', loading: true, error: null })
    
    try {
      // 建立Port连接
      const port = chrome.runtime.connect({ name: portName })
      portRef.current = port
      
      // 🔧 增强的错误处理 - Port断开检测
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          const error = `Port disconnected: ${chrome.runtime.lastError.message}`
          console.error(`Port ${portName} error:`, error)
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error 
          }))
          options.onError?.(error)
        }
        portRef.current = null
      })
      
      // 设置消息监听器
      port.onMessage.addListener((message: PortMessage) => {
        switch (message.type) {
          case 'chunk':
            if (message.data) {
              setState(prev => {
                const newData = prev.data + message.data
                options.onChunk?.(newData)
                return { ...prev, data: newData }
              })
            }
            break
            
          case 'done':
            setState(prev => {
              options.onComplete?.(prev.data)
              return { ...prev, loading: false }
            })
            // 成功完成后断开连接
            try {
              port.disconnect()
            } catch (error) {
              // 忽略断开连接错误
            }
            portRef.current = null
            break
            
          case 'error':
            const errorMsg = message.error || 'Unknown streaming error'
            setState(prev => ({
              ...prev,
              loading: false,
              error: errorMsg
            }))
            options.onError?.(errorMsg)
            // 错误时断开连接
            try {
              port.disconnect()
            } catch (error) {
              // 忽略断开连接错误
            }
            portRef.current = null
            break
            
          default:
            console.warn(`Unknown message type from port ${portName}:`, message)
        }
      })
      
      // 发送请求 - 包含service和action信息
      const requestMessage: PortRequest = {
        type: 'execute',
        service,
        action,
        data: request
      }
      
      port.postMessage(requestMessage)
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to establish port connection ${portName}:`, errorMsg)
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg
      }))
      options.onError?.(errorMsg)
    }
  }, [service, action, portName])
  
  return { 
    ...state, 
    execute 
  }
}

/**
 * Hook返回类型（用于类型推导）
 */
export type StreamHookResult = ReturnType<typeof useStreamBase>

/**
 * 流式选项类型导出（供其他Hook使用）
 */
export type { StreamOptions }