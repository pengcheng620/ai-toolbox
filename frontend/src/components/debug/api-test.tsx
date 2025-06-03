import React, { useState } from "react"
import { Button, Card, Text, Group, Stack, Alert } from "@mantine/core"
import { apiDebugger } from "../../../lib/utils/debug"
import { apiClient } from "../../../lib/servers/api-config"

export const ApiTestComponent = () => {
  const [testResults, setTestResults] = useState<{
    connection?: any
    cors?: any
    jira?: any
  }>({})
  const [loading, setLoading] = useState(false)

  const runConnectionTest = async () => {
    setLoading(true)
    try {
      const result = await apiDebugger.testConnection()
      setTestResults(prev => ({ ...prev, connection: result }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        connection: { success: false, message: error.message } 
      }))
    }
    setLoading(false)
  }

  const runCorsTest = async () => {
    setLoading(true)
    try {
      const result = await apiDebugger.testCors()
      setTestResults(prev => ({ ...prev, cors: result }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        cors: { success: false, message: error.message } 
      }))
    }
    setLoading(false)
  }

  const runJiraTest = async () => {
    setLoading(true)
    try {
      const result = await apiDebugger.testJiraApi()
      setTestResults(prev => ({ ...prev, jira: result }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        jira: { success: false, message: error.message } 
      }))
    }
    setLoading(false)
  }

  const runFullTest = async () => {
    setLoading(true)
    setTestResults({})
    
    // 运行所有测试
    await runConnectionTest()
    await runCorsTest()
    await runJiraTest()
    
    // 同时在控制台输出详细信息
    await apiDebugger.runFullTest()
    
    setLoading(false)
  }

  const TestResult = ({ result, title }: { result: any, title: string }) => {
    if (!result) return null
    
    return (
      <Alert color={result.success ? "green" : "red"} title={title}>
        <Text size="sm">{result.message}</Text>
        {result.data && (
          <Text size="xs" c="dimmed" mt="xs">
            数据: {JSON.stringify(result.data, null, 2)}
          </Text>
        )}
      </Alert>
    )
  }

  return (
    <Card shadow="sm" padding="lg" style={{ maxWidth: 600, margin: "20px auto" }}>
      <Stack gap="md">
        <Text size="lg" fw={500}>API 连接测试工具</Text>
        
        <Group gap="sm">
          <Button onClick={runConnectionTest} loading={loading} size="sm">
            测试连接
          </Button>
          <Button onClick={runCorsTest} loading={loading} size="sm">
            测试CORS
          </Button>
          <Button onClick={runJiraTest} loading={loading} size="sm">
            测试Jira API
          </Button>
          <Button onClick={runFullTest} loading={loading} variant="filled">
            完整测试
          </Button>
        </Group>

        <Stack gap="sm">
          <TestResult result={testResults.connection} title="连接测试" />
          <TestResult result={testResults.cors} title="CORS测试" />
          <TestResult result={testResults.jira} title="Jira API测试" />
        </Stack>

        <Alert color="blue" title="使用说明">
          <Text size="sm">
            1. 确保后端服务在 http://localhost:8000 运行<br/>
            2. 打开浏览器开发者工具查看详细日志<br/>
            3. 如果测试失败，检查后端CORS配置和服务状态
          </Text>
        </Alert>
      </Stack>
    </Card>
  )
} 