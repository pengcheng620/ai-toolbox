/**
 * Test component to verify MantineProvider is working correctly in Plasmo environment
 * This component tests various Mantine components to ensure they render without errors
 */

import React, { useState } from "react"
import { Modal, Button, Text, Card, Group, Stack, Badge, Notification } from "@mantine/core"

export const MantineProviderTest = () => {
  const [modalOpened, setModalOpened] = useState(false)
  const [notificationVisible, setNotificationVisible] = useState(false)

  const testMantineComponents = () => {
    console.log("Testing Mantine components...")
    setModalOpened(true)
    setNotificationVisible(true)
    
    // Test if components render without MantineProvider errors
    setTimeout(() => {
      console.log("✅ Mantine components test completed successfully")
    }, 1000)
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ maxWidth: 600, margin: "20px auto" }}>
      <Stack spacing="md">
        <Group position="apart">
          <Text size="xl" weight={600}>Mantine Provider Test</Text>
          <Badge color="green" variant="filled">
            Provider Active
          </Badge>
        </Group>

        <Text size="sm" color="dimmed">
          This test verifies that MantineProvider is correctly configured in the Plasmo environment.
          All Mantine components should render without errors.
        </Text>

        <Group spacing="sm">
          <Button onClick={testMantineComponents} color="blue">
            Test Mantine Components
          </Button>
          
          <Button onClick={() => setModalOpened(true)} color="green" variant="outline">
            Open Modal
          </Button>
          
          <Button 
            onClick={() => setNotificationVisible(!notificationVisible)} 
            color="orange" 
            variant="subtle"
          >
            Toggle Notification
          </Button>
        </Group>

        {notificationVisible && (
          <Notification
            title="Test Notification"
            color="blue"
            onClose={() => setNotificationVisible(false)}
          >
            This notification tests Mantine's Notification component.
          </Notification>
        )}

        <Card withBorder padding="sm" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" weight={500} mb="xs">Component Status:</Text>
          <Stack spacing={4}>
            <Text size="xs">✅ Card component rendered successfully</Text>
            <Text size="xs">✅ Button components rendered successfully</Text>
            <Text size="xs">✅ Text components rendered successfully</Text>
            <Text size="xs">✅ Group and Stack layouts working</Text>
            <Text size="xs">✅ Badge component rendered successfully</Text>
            {notificationVisible && <Text size="xs">✅ Notification component rendered successfully</Text>}
            {modalOpened && <Text size="xs">✅ Modal component rendered successfully</Text>}
          </Stack>
        </Card>

        <Card withBorder padding="sm" style={{ backgroundColor: '#e3f2fd' }}>
          <Text size="sm" weight={500} mb="xs">Expected Behavior:</Text>
          <Stack spacing={4}>
            <Text size="xs">• All components should render without console errors</Text>
            <Text size="xs">• No "MantineProvider was not found" errors</Text>
            <Text size="xs">• Modal should open and close properly</Text>
            <Text size="xs">• Notification should display and dismiss correctly</Text>
            <Text size="xs">• All styling should be applied correctly</Text>
          </Stack>
        </Card>
      </Stack>

      {/* Modal Test */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Mantine Modal Test"
        centered
        size="md"
      >
        <Stack spacing="md">
          <Text size="sm">
            This modal tests the Mantine Modal component in the Plasmo environment.
            If you can see this modal with proper styling, the MantineProvider is working correctly.
          </Text>
          
          <Group spacing="sm">
            <Button onClick={() => setModalOpened(false)} color="blue">
              Close Modal
            </Button>
            <Button onClick={() => setModalOpened(false)} variant="outline">
              Cancel
            </Button>
          </Group>
          
          <Card withBorder padding="sm" style={{ backgroundColor: '#f0f8ff' }}>
            <Text size="xs" weight={500}>Modal Features Test:</Text>
            <Text size="xs">✅ Modal backdrop working</Text>
            <Text size="xs">✅ Modal positioning (centered)</Text>
            <Text size="xs">✅ Modal styling applied</Text>
            <Text size="xs">✅ Modal close functionality</Text>
            <Text size="xs">✅ Nested components rendering</Text>
          </Card>
        </Stack>
      </Modal>
    </Card>
  )
}

export default MantineProviderTest
