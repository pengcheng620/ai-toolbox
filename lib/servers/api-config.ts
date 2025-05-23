import { apiBaseUrl } from "../config/environment"

// API 配置文件
export interface ApiConfig {
  baseUrl: string
  apiVersion: string
  endpoints: {
    github: {
      pr: string
      commit: string
      review: string
      releaseNotes: string
    }
    jira: {
      comment: string
      acceptanceCriteria: string
      estimate: string
    }
    ai: {
      health: string
      generate: string
      chat: string
    }
    auth: {
      login: string
      me: string
      logout: string
      health: string
    }
  }
}

// 默认配置
export const defaultApiConfig: ApiConfig = {
  baseUrl: apiBaseUrl,
  apiVersion: "/api/v1",
  endpoints: {
    github: {
      pr: "/ai/github/pr",
      commit: "/ai/github/commit", 
      review: "/ai/github/review",
      releaseNotes: "/ai/github/release-notes"
    },
    jira: {
      comment: "/ai/jira/comment",
      acceptanceCriteria: "/ai/jira/acceptance-criteria",
      estimate: "/ai/jira/estimate"
    },
    ai: {
      health: "/ai/health",
      generate: "/ai/generate",
      chat: "/ai/chat/stream"
    },
    auth: {
      login: "/auth/login",
      me: "/auth/me", 
      logout: "/auth/logout",
      health: "/auth/health"
    }
  }
}

// API响应类型定义
export interface GitHubPRResponse {
  generated_description: string
  suggested_title: string
  model: string
  tokens_used: number
  error?: string
}

export interface JiraCommentResponse {
  generated_content: string
  suggestions: string[]
  model: string
  tokens_used: number
  error?: string
}

export interface ApiError {
  detail: string
  status?: number
}

// API 客户端类
export class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig = defaultApiConfig) {
    this.config = config
  }

  private getFullUrl(endpoint: string): string {
    const url = `${this.config.baseUrl}${this.config.apiVersion}${endpoint}`
    console.log("🔗 API URL:", url)
    return url
  }

  private async handleResponse<T>(response: Response, requestInfo?: any): Promise<T> {
    console.log("📡 响应状态:", response.status, response.statusText)
    console.log("📡 响应头:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status} ${response.statusText}`
      let errorDetail = ""
      
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData: ApiError = await response.json()
          errorDetail = errorData.detail || errorMessage
        } else {
          errorDetail = await response.text()
        }
        console.error("❌ API错误详情:", errorDetail)
      } catch (parseError) {
        console.error("❌ 解析错误响应失败:", parseError)
        errorDetail = errorMessage
      }
      
      // 根据状态码提供更友好的错误信息
      switch (response.status) {
        case 400:
          errorMessage = `请求参数错误: ${errorDetail}`
          break
        case 401:
          errorMessage = "认证失败，请检查API密钥"
          break
        case 403:
          errorMessage = "权限不足"
          break
        case 404:
          errorMessage = "API端点不存在，请检查后端服务"
          break
        case 500:
          errorMessage = `服务器内部错误: ${errorDetail}`
          break
        case 502:
        case 503:
        case 504:
          errorMessage = "后端服务不可用，请稍后重试"
          break
        default:
          errorMessage = errorDetail || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    try {
      const data = await response.json()
      console.log("✅ API响应数据:", data)
      return data
    } catch (error) {
      console.error("❌ 解析响应JSON失败:", error)
      throw new Error("响应解析失败")
    }
  }

  // GitHub API 方法
  async generateGitHubPR(data: {
    pr_title: string
    code_changes: string
    branch_name?: string
    commit_messages?: string[]
  }): Promise<GitHubPRResponse> {
    console.log("🚀 发送GitHub PR请求:", data)
    
    const response = await fetch(this.getFullUrl(this.config.endpoints.github.pr), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    return this.handleResponse<GitHubPRResponse>(response, data)
  }

  async generateCommitMessage(data: {
    code_changes: string
    change_type?: string
    scope?: string
  }) {
    console.log("🚀 发送Commit消息请求:", data)
    
    const response = await fetch(this.getFullUrl(this.config.endpoints.github.commit), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    return this.handleResponse(response, data)
  }

  // Jira API 方法
  async generateJiraComment(data: {
    task_description: string
    task_type?: string
    context?: Record<string, any>
  }): Promise<JiraCommentResponse> {
    console.log("🚀 发送Jira评论请求:", data)
    
    const response = await fetch(this.getFullUrl(this.config.endpoints.jira.comment), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    return this.handleResponse<JiraCommentResponse>(response, data)
  }

  async generateAcceptanceCriteria(data: {
    task_description: string
    user_story?: string
    context?: Record<string, any>
  }) {
    console.log("🚀 发送验收标准请求:", data)
    
    const response = await fetch(this.getFullUrl(this.config.endpoints.jira.acceptanceCriteria), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    return this.handleResponse(response, data)
  }

  // 健康检查
  async checkHealth() {
    console.log("🚀 发送健康检查请求")
    
    const response = await fetch(this.getFullUrl(this.config.endpoints.ai.health))
    return this.handleResponse(response)
  }
}

// 全局API客户端实例
export const apiClient = new ApiClient() 