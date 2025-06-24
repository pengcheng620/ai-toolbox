"""GitHub prompts module."""

from app.prompts.github.pr_description import (
    PR_DESCRIPTION_PROMPT,
    PR_DESCRIPTION_WITH_TEMPLATE_PROMPT,
    PR_DESCRIPTION_WITHOUT_TEMPLATE_PROMPT,
)
from app.prompts.github.commit_message import COMMIT_MESSAGE_PROMPT
from app.prompts.github.code_review import CODE_REVIEW_PROMPT
from app.prompts.github.release_notes import RELEASE_NOTES_PROMPT
from app.prompts.github.task_description import TASK_DESCRIPTION_PROMPT

class GitHubPrompts:
    """GitHub prompts collection."""

    PR_DESCRIPTION = PR_DESCRIPTION_PROMPT
    PR_DESCRIPTION_WITH_TEMPLATE = PR_DESCRIPTION_WITH_TEMPLATE_PROMPT
    PR_DESCRIPTION_WITHOUT_TEMPLATE = PR_DESCRIPTION_WITHOUT_TEMPLATE_PROMPT
    COMMIT_MESSAGE = COMMIT_MESSAGE_PROMPT
    CODE_REVIEW = CODE_REVIEW_PROMPT
    RELEASE_NOTES = RELEASE_NOTES_PROMPT
    TASK_DESCRIPTION = TASK_DESCRIPTION_PROMPT

# Global instance
github_prompts = GitHubPrompts() 