import React, { useState, useRef, useEffect } from "react"
import { Popover, TextInput, Button, Group, Text, Stack } from "@mantine/core"
import { TicketIcon } from "@heroicons/react/16/solid"

interface JiraTicketInputProps {
  onSubmit: (ticketId: string | null) => void
  onCancel: () => void
  isOpen: boolean
  children: React.ReactNode // The target element to attach the popover to
}

export const JiraTicketInput: React.FC<JiraTicketInputProps> = ({
  onSubmit,
  onCancel,
  isOpen,
  children
}) => {
  const [ticketId, setTicketId] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false) // Prevent duplicate submissions
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTicketId("")
      setError("")
      setIsSubmitting(false)
      // Focus the input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const validateTicketId = (value: string): boolean => {
    if (!value.trim()) return true // Empty is allowed (optional)
    
    // Jira ticket format: 2+ letters, dash, numbers (e.g., PROJ-123, UC-74354)
    const jiraRegex = /^[A-Z]{2,}-\d+$/i
    return jiraRegex.test(value.trim())
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setTicketId(value)
    
    // Clear error when user starts typing
    if (error) {
      setError("")
    }
  }

  const handleSubmit = () => {
    if (isSubmitting) return // Prevent duplicate submissions

    const trimmedValue = ticketId.trim()

    if (trimmedValue && !validateTicketId(trimmedValue)) {
      setError("Please enter a valid Jira ticket ID (e.g., PROJ-123)")
      return
    }

    setIsSubmitting(true)
    // Submit with the ticket ID or null if empty (skip Jira integration)
    onSubmit(trimmedValue || null)
  }

  const handleSkip = () => {
    if (isSubmitting) return // Prevent duplicate submissions

    setIsSubmitting(true)
    onSubmit(null)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSubmit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <Popover
      opened={isOpen}
      onChange={(opened) => {
        if (!opened && !isSubmitting) {
          onCancel()
        }
      }}
      position="bottom-start"
      width={320}
      trapFocus
      withArrow
      shadow="md"
      closeOnClickOutside={!isSubmitting} // Prevent closing during submission
      closeOnEscape={!isSubmitting} // Prevent closing during submission
    >
      <Popover.Target>
        {children}
      </Popover.Target>
      <Popover.Dropdown>
        <JiraInputContent />
      </Popover.Dropdown>
    </Popover>
  )

  function JiraInputContent() {
    return (
      <Stack gap="md">
        <Group gap="xs" align="center">
          <TicketIcon style={{ width: 16, height: 16, color: "#2563eb" }} />
          <Text size="sm" fw={500}>
            Jira Ticket (Optional)
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          Enter a Jira ticket ID to include ticket information in the PR description, or skip to generate without Jira integration.
        </Text>

        <TextInput
          ref={inputRef}
          value={ticketId}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="e.g., PROJ-123, UC-74354"
          error={error}
          size="xs"
          data-autofocus
          label="Jira Ticket ID"
        />

        <Group gap="sm" justify="flex-end">
          <Button
            variant="subtle"
            size="xs"
            onClick={handleSkip}
            color="gray"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Skip Jira"}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            onClick={onCancel}
            color="gray"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={handleSubmit}
            color="blue"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Continue
          </Button>
        </Group>
      </Stack>
    )
  }
}

export default JiraTicketInput
