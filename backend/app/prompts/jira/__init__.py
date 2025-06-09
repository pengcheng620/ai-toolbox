"""Jira prompts module."""

from app.prompts.jira.definition_of_done import DEFINITION_OF_DONE_PROMPT

class JiraPrompts:
    """Jira prompts collection."""

    DEFINITION_OF_DONE = DEFINITION_OF_DONE_PROMPT

# Global instance
jira_prompts = JiraPrompts()