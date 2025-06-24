// 默认配置 - 支持环境变量覆盖
const DEFAULT_BASE_URL = "http://localhost:8000"

// API配置接口
export interface ApiConfig {
  baseUrl: string
  endpoints: {
    ai: {
      health: string
      github: {
        prFromJira: string
      }
      jira: {
        generate: string
      }
    }
    sprintPlanning: {
      boardInfo: (boardId: string) => string
    }
  }
}

// 构建API配置
function buildApiConfig(baseUrl: string): ApiConfig {
    return {
      baseUrl,
      endpoints: {
        ai: {
          health: `${baseUrl}/api/v1/ai/health`,
          github: {
            prFromJira: `${baseUrl}/api/v1/ai/github/pr-from-jira`
          },
          jira: {
            generate: `${baseUrl}/api/v1/ai/jira/generate`
          }
        },
        sprintPlanning: {
          boardInfo: (boardId: string) => `${baseUrl}/api/v1/sprint-planning/board-info/${boardId}`
        }
      }
    }
  }

// 获取环境变量，支持Chrome扩展环境
function getEnvVar(key: string, defaultValue: string = ""): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  // Chrome扩展环境可能没有process.env
  return defaultValue
}

// 同步获取API配置（用于初始化和简单场景）
export function getApiConfigSync(): ApiConfig {
  const baseUrl = getEnvVar("NEXT_PUBLIC_API_BASE_URL", DEFAULT_BASE_URL)
  return buildApiConfig(baseUrl)
}


// 导出默认配置实例（向后兼容）
export const defaultApiConfig = getApiConfigSync() 