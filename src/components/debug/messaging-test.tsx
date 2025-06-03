import React, { useState } from "react"
import { useHealthCheckMessaging, useJiraCommentMessaging } from "~hook/use-api-messaging"

export const MessagingTest = () => {
  const [testResults, setTestResults] = useState<string[]>([])
  const healthCheck = useHealthCheckMessaging()
  const jiraMessaging = useJiraCommentMessaging()

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testHealthCheck = async () => {
    addResult("🔍 开始健康检查测试...")
    try {
      const result = await healthCheck.execute({})
      if (result) {
        addResult("✅ 健康检查成功: " + JSON.stringify(result))
      } else {
        addResult("❌ 健康检查失败: 无结果")
      }
    } catch (error) {
      addResult("❌ 健康检查错误: " + error.message)
    }
  }

  const testJiraMessaging = async () => {
    addResult("🔍 开始Jira消息测试...")
    try {
      const result = await jiraMessaging.execute({
        task_description: "测试任务描述",
        task_type: "development",
        context: {
          source: "debug_test",
          timestamp: new Date().toISOString()
        }
      })
      if (result) {
        addResult("✅ Jira消息成功: " + JSON.stringify(result).substring(0, 100) + "...")
      } else {
        addResult("❌ Jira消息失败: 无结果")
      }
    } catch (error) {
      addResult("❌ Jira消息错误: " + error.message)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div style={{ 
      position: "fixed", 
      top: "10px", 
      right: "10px", 
      background: "white", 
      border: "2px solid #ccc", 
      padding: "10px", 
      borderRadius: "5px",
      maxWidth: "400px",
      maxHeight: "300px",
      overflow: "auto",
      zIndex: 10000,
      fontSize: "12px"
    }}>
      <h3>Plasmo消息系统调试</h3>
      
      <div style={{ marginBottom: "10px" }}>
        <button onClick={testHealthCheck} disabled={healthCheck.loading}>
          {healthCheck.loading ? "测试中..." : "测试健康检查"}
        </button>
        <button onClick={testJiraMessaging} disabled={jiraMessaging.loading} style={{ marginLeft: "5px" }}>
          {jiraMessaging.loading ? "测试中..." : "测试Jira消息"}
        </button>
        <button onClick={clearResults} style={{ marginLeft: "5px" }}>
          清空结果
        </button>
      </div>

      <div style={{ 
        background: "#f5f5f5", 
        padding: "5px", 
        borderRadius: "3px",
        maxHeight: "200px",
        overflow: "auto"
      }}>
        {testResults.length === 0 ? (
          <div>点击按钮开始测试...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: "2px", fontSize: "11px" }}>
              {result}
            </div>
          ))
        )}
      </div>

      {(healthCheck.error || jiraMessaging.error) && (
        <div style={{ color: "red", marginTop: "5px", fontSize: "11px" }}>
          错误: {healthCheck.error || jiraMessaging.error}
        </div>
      )}
    </div>
  )
}

export default MessagingTest 