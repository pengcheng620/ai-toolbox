// 🎯 AI Toolbox 统一流式处理配置
// 简化架构 - 将端点和端口配置合并到单一文件

/**
 * 流式处理配置 - 定义所有服务的API端点
 */
export const STREAMING_CONFIG = {
  jira: {
    'ticket-summary': '/ai/jira/summary',
    'message-optimize': '/ai/jira/optimize', 
    'status-check': '/ai/jira/statuscheck'
  },
  github: {
    'pr-description': '/ai/github/pr',
    'code-review': '/ai/github/code-review', 
    'commit-message': '/ai/github/commit-message'
  }
} as const

/**
 * 支持的服务类型
 */
export type ServiceType = keyof typeof STREAMING_CONFIG

/**
 * 根据服务获取支持的动作类型
 */
export type ActionType<T extends ServiceType> = keyof typeof STREAMING_CONFIG[T]

/**
 * 🔧 工具函数：根据service和action生成端口名
 * 约定：使用 service-action 格式 (如: jira-ticket-summary)
 */
export function getPortName(service: string, action: string): string {
  return `${service}-${action}`
}

/**
 * 🔧 工具函数：根据service和action获取API端点
 * 带类型安全检查，防止配置错误
 */
export function getEndpoint(service: ServiceType, action: string): string {
  const endpoints = STREAMING_CONFIG[service]
  if (!endpoints || !(action in endpoints)) {
    throw new Error(`Unknown endpoint: ${service}/${action}`)
  }
  return endpoints[action as keyof typeof endpoints]
}

/**
 * 🔧 工具函数：验证服务和动作是否支持
 */
export function isValidServiceAction(service: string, action: string): boolean {
  if (!(service in STREAMING_CONFIG)) {
    return false
  }
  const serviceConfig = STREAMING_CONFIG[service as ServiceType]
  return action in serviceConfig
}

/**
 * 🔧 工具函数：获取所有支持的端口名称
 * 用于调试和监控
 */
export function getAllPortNames(): string[] {
  const portNames: string[] = []
  
  for (const service of Object.keys(STREAMING_CONFIG)) {
    const actions = Object.keys(STREAMING_CONFIG[service as ServiceType])
    for (const action of actions) {
      portNames.push(getPortName(service, action))
    }
  }
  
  return portNames
}