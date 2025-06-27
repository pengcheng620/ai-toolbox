/**
 * Test component for JiraTicketInput functionality
 * This component tests the new optional Jira ticket input feature
 */

import React, { useState } from "react"
import { Button, Card, Group, Stack, Text, Badge, Code } from "@mantine/core"
import { JiraTicketInput } from "../components/github/jira-ticket-input"

export const JiraTicketInputTest = () => {
  const [showInput, setShowInput] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const handleSubmit = (ticketId: string | null) => {
    setShowInput(false)
    setLastResult(ticketId)
    
    if (ticketId) {
      addTestResult(`✅ Jira ticket submitted: ${ticketId}`)
    } else {
      addTestResult(`✅ Skipped Jira integration (null ticket)`)
    }
  }

  const handleCancel = () => {
    setShowInput(false)
    setLastResult("CANCELLED")
    addTestResult(`❌ User cancelled Jira input`)
  }

  const testValidTicket = () => {
    addTestResult("🧪 Testing valid ticket input...")
    setShowInput(true)
  }

  const testSkipJira = () => {
    addTestResult("🧪 Testing skip Jira functionality...")
    setShowInput(true)
  }

  const testCancelFlow = () => {
    addTestResult("🧪 Testing cancel flow...")
    setShowInput(true)
  }

  const clearResults = () => {
    setTestResults([])
    setLastResult(null)
  }

  const getResultBadgeColor = (result: string | null) => {
    if (result === null) return "gray"
    if (result === "CANCELLED") return "red"
    if (result === "") return "yellow"
    return "green"
  }

  const getResultText = (result: string | null) => {
    if (result === null) return "No result yet"
    if (result === "CANCELLED") return "User cancelled"
    if (result === "") return "Skipped Jira"
    return `Jira ticket: ${result}`
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ maxWidth: 800, margin: "20px auto" }}>
      <Stack gap="md">
        <Group justify="apart">
          <Text size="xl" fw={600}>Jira Ticket Input Test</Text>
          <Badge color="blue" variant="filled">
            Optional Input Feature
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          This test verifies the new optional Jira ticket input functionality that replaces window.prompt().
          The feature should allow users to optionally enter a Jira ticket or skip Jira integration entirely.
        </Text>

        <Card withBorder padding="sm" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" fw={500} mb="xs">Current Result:</Text>
          <Group gap="sm">
            <Badge color={getResultBadgeColor(lastResult)}>
              {getResultText(lastResult)}
            </Badge>
            {lastResult && lastResult !== "CANCELLED" && (
              <Code size="xs">{JSON.stringify({ jira_ticket_id: lastResult || "" })}</Code>
            )}
          </Group>
        </Card>

        <Group gap="sm">
          <Button onClick={testValidTicket} color="blue">
            Test Valid Ticket Input
          </Button>
          
          <Button onClick={testSkipJira} color="green" variant="outline">
            Test Skip Jira
          </Button>
          
          <Button onClick={testCancelFlow} color="orange" variant="subtle">
            Test Cancel Flow
          </Button>
          
          <Button onClick={clearResults} color="gray" variant="light">
            Clear Results
          </Button>
        </Group>

        <Card withBorder padding="sm" style={{ backgroundColor: '#e3f2fd' }}>
          <Text size="sm" fw={500} mb="xs">Test Instructions:</Text>
          <Stack gap={4}>
            <Text size="xs">• <strong>Valid Ticket:</strong> Enter formats like "PROJ-123", "UC-74354"</Text>
            <Text size="xs">• <strong>Skip Jira:</strong> Click "Skip Jira" or leave input empty and click "Continue"</Text>
            <Text size="xs">• <strong>Cancel:</strong> Click "Cancel" or press Escape key</Text>
            <Text size="xs">• <strong>Keyboard:</strong> Press Enter to submit, Escape to cancel</Text>
          </Stack>
        </Card>

        <Card withBorder padding="sm" style={{ backgroundColor: '#f0f8ff' }}>
          <Text size="sm" fw={500} mb="xs">Expected Behavior:</Text>
          <Stack gap={4}>
            <Text size="xs">✅ Modal should open with focus on input field</Text>
            <Text size="xs">✅ Valid Jira tickets should be accepted (format: ABC-123)</Text>
            <Text size="xs">✅ Invalid formats should show error message</Text>
            <Text size="xs">✅ Empty input + Continue should result in null (skip Jira)</Text>
            <Text size="xs">✅ Skip Jira button should immediately return null</Text>
            <Text size="xs">✅ Cancel should close modal without submission</Text>
            <Text size="xs">✅ Keyboard shortcuts should work (Enter/Escape)</Text>
          </Stack>
        </Card>

        {testResults.length > 0 && (
          <Card withBorder padding="sm" style={{ backgroundColor: '#fff3e0' }}>
            <Text size="sm" fw={500} mb="xs">Test Results:</Text>
            <Stack gap={2}>
              {testResults.map((result, index) => (
                <Text key={index} size="xs" ff="monospace">
                  {result}
                </Text>
              ))}
            </Stack>
          </Card>
        )}

        <Card withBorder padding="sm" style={{ backgroundColor: '#e8f5e8' }}>
          <Text size="sm" fw={500} mb="xs">Integration Benefits:</Text>
          <Stack gap={4}>
            <Text size="xs">🚀 <strong>Better UX:</strong> Modern modal UI instead of browser prompt</Text>
            <Text size="xs">🎯 <strong>Optional:</strong> Users can skip Jira integration gracefully</Text>
            <Text size="xs">⌨️ <strong>Accessible:</strong> Keyboard navigation and focus management</Text>
            <Text size="xs">🎨 <strong>Consistent:</strong> Matches existing Mantine design system</Text>
            <Text size="xs">🔧 <strong>Flexible:</strong> Easy to extend with additional features</Text>
          </Stack>
        </Card>
      </Stack>

      {/* Jira Ticket Input Popover */}
      <JiraTicketInput
        isOpen={showInput}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      >
        <Button variant="outline" size="sm">
          Test Target Button
        </Button>
      </JiraTicketInput>
    </Card>
  )
}

export default JiraTicketInputTest
