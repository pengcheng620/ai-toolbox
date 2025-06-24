import { getApiConfigSync } from "../config/api-config"

// 调试工具
export class ApiDebugger {
  private baseUrl: string
  private apiConfig = getApiConfigSync()

  constructor(baseUrl?: string) {
    // 如果传入了baseUrl，则使用传入的；否则使用配置文件中的
    this.baseUrl = baseUrl || this.apiConfig.baseUrl
  }

  // 测试后端连接
  async testConnection(): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (response.ok) {
        const data = await response.json()
        return { success: true, message: `连接成功: ${data.message}` }
      } else {
        return { success: false, message: `连接失败: ${response.status} ${response.statusText}` }
      }
    } catch (error) {
      return { success: false, message: `连接错误: ${error.message}` }
    }
  }

  // 测试CORS预检
  async testCors(): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      })
      
      if (response.ok || response.status === 204) {
        return { success: true, message: "CORS预检成功" }
      } else {
        return { success: false, message: `CORS预检失败: ${response.status}` }
      }
    } catch (error) {
      return { success: false, message: `CORS预检错误: ${error.message}` }
    }
  }

  // 测试Jira API
  async testJiraApi(): Promise<{success: boolean, message: string, data?: any}> {
    try {
      const testData = {
        task_description: "测试任务描述",
        task_type: "development", 
        context: {}
      }

      console.log("发送请求到:", `${this.baseUrl}/api/v1/ai/jira/comment`)
      console.log("请求数据:", testData)

      const response = await fetch(`${this.baseUrl}/api/v1/ai/jira/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(testData)
      })

      console.log("响应状态:", response.status)
      console.log("响应头:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        return { success: true, message: "Jira API测试成功", data }
      } else {
        const errorText = await response.text()
        console.log("错误响应内容:", errorText)
        return { success: false, message: `Jira API测试失败: ${response.status} - ${errorText}` }
      }
    } catch (error) {
      console.error("Jira API测试错误:", error)
      return { success: false, message: `Jira API测试错误: ${error.message}` }
    }
  }

  // 综合测试
  async runFullTest(): Promise<void> {
    console.group("🔍 API调试测试")
    
    console.log("1. 测试基础连接...")
    const connectionTest = await this.testConnection()
    console.log(connectionTest.success ? "✅" : "❌", connectionTest.message)

    console.log("\n2. 测试CORS配置...")
    const corsTest = await this.testCors()
    console.log(corsTest.success ? "✅" : "❌", corsTest.message)

    console.log("\n3. 测试Jira API...")
    const jiraTest = await this.testJiraApi()
    console.log(jiraTest.success ? "✅" : "❌", jiraTest.message)
    if (jiraTest.data) {
      console.log("返回数据:", jiraTest.data)
    }

    console.groupEnd()
  }
}

// 全局调试器实例
export const apiDebugger = new ApiDebugger()

// 在浏览器控制台中可用的调试命令
if (typeof window !== 'undefined') {
  (window as any).debugApi = apiDebugger
} 