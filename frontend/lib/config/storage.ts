import { Storage } from "@plasmohq/storage"
import { getApiConfigSync } from "./api-config"


const apiConfig = getApiConfigSync()
// 默认API Base URL
const DEFAULT_API_BASE_URL = apiConfig.baseUrl

// 存储键名常量
export const STORAGE_KEYS = {
  API_BASE_URL: "api_base_url",
  USER_PREFERENCES: "user_preferences",
  LAST_USED_SETTINGS: "last_used_settings",
  API_HEALTH_STATUS: "api_health_status"
} as const

// 用户偏好设置类型
export interface UserPreferences {
  autoGenerateOnLoad: boolean
  preferredLanguage: "zh" | "en"
  notificationEnabled: boolean
  darkMode: boolean
}

// API健康状态类型
export interface ApiHealthStatus {
  isHealthy: boolean
  lastChecked: number
  error?: string
}

// 默认用户偏好设置
export const defaultUserPreferences: UserPreferences = {
  autoGenerateOnLoad: false,
  preferredLanguage: "zh",
  notificationEnabled: true,
  darkMode: false
}

// 创建存储实例
export const storage = new Storage({
  area: "local" // 使用本地存储
})

// 存储工具函数
export class StorageHelper {
  static async getApiBaseUrl(): Promise<string> {
    return await storage.get(STORAGE_KEYS.API_BASE_URL) || DEFAULT_API_BASE_URL
  }

  static async setApiBaseUrl(url: string): Promise<void> {
    await storage.set(STORAGE_KEYS.API_BASE_URL, url)
  }

  static async getUserPreferences(): Promise<UserPreferences> {
    const prefs = await storage.get(STORAGE_KEYS.USER_PREFERENCES) as Partial<UserPreferences> | undefined
    return { 
      ...defaultUserPreferences, 
      ...(prefs || {})
    }
  }

  static async setUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = await this.getUserPreferences()
    await storage.set(STORAGE_KEYS.USER_PREFERENCES, { ...currentPrefs, ...preferences })
  }

  static async getApiHealthStatus(): Promise<ApiHealthStatus | null> {
    return await storage.get(STORAGE_KEYS.API_HEALTH_STATUS)
  }

  static async setApiHealthStatus(status: ApiHealthStatus): Promise<void> {
    await storage.set(STORAGE_KEYS.API_HEALTH_STATUS, status)
  }

  static async getLastUsedSettings(): Promise<Record<string, any>> {
    return await storage.get(STORAGE_KEYS.LAST_USED_SETTINGS) || {}
  }

  static async setLastUsedSettings(settings: Record<string, any>): Promise<void> {
    await storage.set(STORAGE_KEYS.LAST_USED_SETTINGS, settings)
  }

  // 清除所有存储数据
  static async clearAll(): Promise<void> {
    await storage.clear()
  }
} 