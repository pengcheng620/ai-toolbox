"""Jira prompts module."""

from app.prompts.jira.definition_of_done import DEFINITION_OF_DONE_PROMPT
from app.prompts.jira.ticket_summary import TICKET_SUMMARY_PROMPT

class JiraPrompts:
    """Jira prompts collection."""

    DEFINITION_OF_DONE = DEFINITION_OF_DONE_PROMPT
    TICKET_SUMMARY = TICKET_SUMMARY_PROMPT

# Global instance
jira_prompts = JiraPrompts()