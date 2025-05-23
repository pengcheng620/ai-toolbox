import { StorageHelper } from "./storage"

// 环境配置文件
export interface EnvironmentConfig {
  apiBaseUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

// 获取环境变量，支持Chrome扩展环境
function getEnvVar(key: string, defaultValue: string = ""): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  // Chrome扩展环境可能没有process.env
  return defaultValue
}

// 基础环境配置
const baseConfig = {
  isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
  isProduction: getEnvVar("NODE_ENV", "development") === "production"
}

// 获取动态API Base URL
export async function getApiBaseUrl(): Promise<string> {
  try {
    return await StorageHelper.getApiBaseUrl()
  } catch {
    return getEnvVar("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")
  }
}

// 同步获取API Base URL（用于初始化）
export const apiBaseUrl = getEnvVar("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")

// 获取完整环境配置
export async function getEnvironmentConfig(): Promise<EnvironmentConfig> {
  const apiUrl = await getApiBaseUrl()
  return {
    ...baseConfig,
    apiBaseUrl: apiUrl
  }
}

// 静态环境配置（向后兼容）
export const environment: EnvironmentConfig = {
  ...baseConfig,
  apiBaseUrl
}

// 导出常用的环境变量
export const { isDevelopment, isProduction } = environment 