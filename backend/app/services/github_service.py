"""GitHub service for AI-powered code review and PR management."""

import logging
from typing import Dict, Any, List, Optional, Callable

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.github import github_prompts
from app.services.jira.jira_api_client import jira_api_client

logger = get_logger(__name__)


class GitHubService(BaseAzureAIService):
    """GitHub service for AI-powered code review and PR management."""

    def __init__(self):
        """Initialize GitHub service."""
        super().__init__()
        logger.info("GitHub service initialized")

    async def generate_pr_description(
        self,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate GitHub PR description using specialized prompt."""
        try:
            prompt_config = github_prompts.PR_DESCRIPTION
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(pr_title, code_changes, branch_name, commit_messages)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.7,
            )

            if result.get("success"):
                # Generate suggested title if not provided
                suggested_title = pr_title or "feat: 新功能实现"
                result["generated_description"] = result["text"]
                result["suggested_title"] = suggested_title
                del result["text"]  # Remove original key to match expected format

            logger.info("GitHub PR description generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub PR description generation failed: {str(e)}")
            return {
                "generated_description": "",
                "suggested_title": pr_title or "PR Title",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "error": str(e),
            }

    async def generate_commit_message(
        self,
        code_changes: str,
        change_type: str = "feat",
        scope: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate conventional commit message."""
        try:
            prompt_config = github_prompts.COMMIT_MESSAGE
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(code_changes, change_type, scope)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=800,
                temperature=0.3,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub commit message generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub commit message generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def review_code_changes(
        self,
        code_diff: str,
        review_focus: Optional[str] = None,
        programming_language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate code review comments."""
        try:
            prompt_config = github_prompts.CODE_REVIEW
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(code_diff, review_focus, programming_language)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.4,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub code review completed successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub code review failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_release_notes(
        self,
        version: str,
        commit_messages: List[str],
        breaking_changes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate release notes from commit messages."""
        try:
            prompt_config = github_prompts.RELEASE_NOTES
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(version, commit_messages, breaking_changes)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.5,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub release notes generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub release notes generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_task_description(
        self,
        task_description: str,
    ) -> Dict[str, Any]:
        """Generate task description based on GitHub task description format."""
        try:
            prompt_config = github_prompts.TASK_DESCRIPTION
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1000,
                temperature=0.5,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub task description generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub task description generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_pr_description_from_jira(
        self,
        jira_ticket_id: str,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
        description_template: str = "",
    ) -> Dict[str, Any]:
        """Generate GitHub PR description from Jira ticket and code changes."""
        try:
            # 1. Get Jira ticket details
            async with jira_api_client as client:
                jira_details_result = await client.get_issue_details(
                    issue_key=jira_ticket_id,
                    include_comments=False,
                    include_attachments=False,
                )

            if not jira_details_result.get("success"):
                error_msg = jira_details_result.get(
                    "error", f"Jira ticket {jira_ticket_id} not found or access denied."
                )
                logger.error(f"Failed to retrieve Jira details: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "generated_description": "",
                    "suggested_title": pr_title,
                    "model": settings.azure_openai_deployment_name,
                    "tokens_used": 0,
                }
            
            jira_details = jira_details_result.get("data", {})
            
            # 2. Combine Jira details with other info for the prompt
            jira_summary = jira_details.get("summary", "No summary found.")
            jira_description = jira_details.get("description", "No description found.")
            
            commit_messages_str = "\\n".join(
                f"- {msg}" for msg in commit_messages
            ) if commit_messages else "No commit messages provided."

            # Use a dedicated prompt that knows how to fill a template
            prompt_config = github_prompts.PR_DESCRIPTION_FROM_JIRA
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(
                pr_title=pr_title,
                jira_ticket_id=jira_ticket_id,
                jira_summary=jira_summary,
                jira_description=jira_description,
                branch_name=branch_name,
                code_changes=code_changes,
                commit_messages=commit_messages_str,
                description_template=description_template,
            )

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.7,
            )

            if result.get("success"):
                result["generated_description"] = result["text"]
                result["suggested_title"] = pr_title or jira_summary or "feat: New feature"
                del result["text"]

            logger.info("GitHub PR description from Jira generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub PR description generation from Jira failed: {str(e)}")
            return {
                "generated_description": "",
                "suggested_title": pr_title or "PR Title",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }


# Global GitHub service instance
github_service = GitHubService() 