"""Jira Ticket Status Check prompt templates."""

TICKET_STATUS_CHECK_SYSTEM_MESSAGE = """You are an expert project manager and Jira analyst. Your task is to analyze Jira ticket status and provide insights about the ticket's current state, progress, and any potential issues."""


def generate_ticket_status_check_prompt(issue_key: str, ticket_data: dict) -> str:
    """Generate a ticket status check prompt based on ticket data."""
    
    return f"""
Check Jira ticket {issue_key}. Ticket Data:
{ticket_data}

Please check follow fields:
- Component must be set

Tell me the result in markdown format only, no other text.
Sample output:
**Result** Passed / Failed \n
**Fields not ready** Story Points, Description \n



"""


TICKET_STATUS_CHECK_PROMPT = {
    "system_message": TICKET_STATUS_CHECK_SYSTEM_MESSAGE,
    "generate_prompt": generate_ticket_status_check_prompt,
    "suggestions": [
        "Check if Story Point is set or greater than 0",
        "Check if Description is set with Context and Acceptance Criteria"
    ]
} 