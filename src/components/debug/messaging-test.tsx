import React, { useState } from "react"
import { Button, Card, Text, Group, Stack, Alert } from "@mantine/core"
import { useHealthCheckMessaging, useJiraCommentMessaging, useGitHubPRMessaging } from "~hook/use-api-messaging"

export const MessagingTestComponent = () => {
  const healthCheck = useHealthCheckMessaging()
  const jiraComment = useJiraCommentMessaging()
  const githubPR = useGitHubPRMessaging()

  const runHealthCheck = async () => {
    await healthCheck.execute({})
  }

  const runJiraTest = async () => {
    await jiraComment.execute({
      task_description: "测试任务描述 - 创建一个用户登录功能",
      task_type: "development",
      context: {
        source: "messaging_test",
        timestamp: new Date().toISOString()
      }
    })
  }

  const runGitHubTest = async () => {
    await githubPR.execute({
      pr_title: "测试PR标题",
      code_changes: "添加了用户登录功能相关代码",
      branch_name: "feature/user-login",
      commit_messages: ["feat: add user login", "fix: handle edge cases"]
    })
  }

  const TestResult = ({ title, result, loading, error }: { 
    title: string, 
    result: any, 
    loading: boolean, 
    error: string | null 
  }) => (
    <Alert 
      color={error ? "red" : result ? "green" : "blue"} 
      title={`${title} ${loading ? "(运行中...)" : ""}`}
    >
      {error && <Text size="sm" c="red">错误: {error}</Text>}
      {result && (
        <Text size="xs" c="dimmed" mt="xs">
          成功: {JSON.stringify(result, null, 2).slice(0, 200)}...
        </Text>
      )}
      {!loading && !error && !result && <Text size="sm">等待测试</Text>}
    </Alert>
  )

  return (
    <Card shadow="sm" padding="lg" style={{ maxWidth: 800, margin: "20px auto" }}>
      <Stack gap="md">
        <Text size="lg" fw={500}>Plasmo Messaging API 测试工具</Text>
        
        <Text size="sm" c="dimmed">
          此工具通过Plasmo Messaging API测试后台脚本与内容脚本的通信，
          避免了CORS问题。
        </Text>
        
        <Group gap="sm">
          <Button 
            onClick={runHealthCheck} 
            loading={healthCheck.loading} 
            size="sm"
            variant="light"
          >
            测试健康检查
          </Button>
          <Button 
            onClick={runJiraTest} 
            loading={jiraComment.loading} 
            size="sm"
            color="orange"
          >
            测试Jira API
          </Button>
          <Button 
            onClick={runGitHubTest} 
            loading={githubPR.loading} 
            size="sm"
            color="green"
          >
            测试GitHub API
          </Button>
        </Group>

        <Stack gap="sm">
          <TestResult 
            title="健康检查" 
            result={healthCheck.data} 
            loading={healthCheck.loading} 
            error={healthCheck.error} 
          />
          <TestResult 
            title="Jira评论生成" 
            result={jiraComment.data} 
            loading={jiraComment.loading} 
            error={jiraComment.error} 
          />
          <TestResult 
            title="GitHub PR生成" 
            result={githubPR.data} 
            loading={githubPR.loading} 
            error={githubPR.error} 
          />
        </Stack>

        <Alert color="blue" title="Messaging API 架构说明">
          <Text size="sm">
            🔄 <strong>新架构</strong>: 内容脚本 → Plasmo Messaging → 后台脚本 → 后端API<br/>
            ✅ <strong>优势</strong>: 避免CORS限制，安全的API调用<br/>
            🎯 <strong>原理</strong>: 后台脚本在扩展环境中运行，不受页面的同源策略限制
          </Text>
        </Alert>
      </Stack>
    </Card>
  )
} 