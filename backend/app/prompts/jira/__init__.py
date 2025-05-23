"""Jira prompts module."""

from app.prompts.jira.task_comment import TASK_COMMENT_PROMPT
from app.prompts.jira.acceptance_criteria import ACCEPTANCE_CRITERIA_PROMPT
from app.prompts.jira.effort_estimation import EFFORT_ESTIMATION_PROMPT
from app.prompts.jira.summary_for_testers import SUMMARY_FOR_TESTERS_PROMPT

class JiraPrompts:
    """Jira prompts collection."""
    
    TASK_COMMENT = TASK_COMMENT_PROMPT
    ACCEPTANCE_CRITERIA = ACCEPTANCE_CRITERIA_PROMPT  
    EFFORT_ESTIMATION = EFFORT_ESTIMATION_PROMPT
    SUMMARY_FOR_TESTERS = SUMMARY_FOR_TESTERS_PROMPT

# Global instance
jira_prompts = JiraPrompts() 