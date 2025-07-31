"""Jira prompts module."""

from app.prompts.jira.definition_of_done import DEFINITION_OF_DONE_PROMPT
from app.prompts.jira.ticket_summary import TICKET_SUMMARY_PROMPT
from app.prompts.jira.message_optimize import MESSAGE_OPTIMIZE_PROMPT
from app.prompts.jira.ticket_status_check import TICKET_STATUS_CHECK_PROMPT

class JiraPrompts:
    """Jira prompts collection."""

    DEFINITION_OF_DONE = DEFINITION_OF_DONE_PROMPT
    TICKET_SUMMARY = TICKET_SUMMARY_PROMPT
    MESSAGE_OPTIMIZE = MESSAGE_OPTIMIZE_PROMPT
    TICKET_STATUS_CHECK = TICKET_STATUS_CHECK_PROMPT

# Global instance
jira_prompts = JiraPrompts()