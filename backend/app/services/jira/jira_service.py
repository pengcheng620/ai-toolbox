"""Jira service for AI-powered Definition of Done (DoD) and Ticket Summary generation."""

from typing import Dict, Any, Callable

from app.services.base_ai import BaseAzureAIService
from app.services.jira.jira_api_client import jira_api_client
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.jira import jira_prompts

logger = get_logger(__name__)


class JiraService(BaseAzureAIService):
    """Jira service for AI-powered Definition of Done (DoD) and Ticket Summary generation."""

    def __init__(self):
        """Initialize Jira service."""
        super().__init__()
        logger.info("Jira service initialized")

    def _format_dod_content(self, content: str) -> str:
        """Format Definition of Done content to ensure proper structure and readability."""
        if not content:
            return content

        import re

        # Clean up the content
        formatted = content.strip()

        # Ensure proper spacing between sections (headers)
        formatted = re.sub(r'(\*\*[^*]+\*\*)\s*([^\n*])', r'\1\n\n\2', formatted)

        # Ensure proper spacing between list items
        formatted = re.sub(r'^(\s*-\s+\*\*[^*]+\*\*.*?)(\s*-\s+\*\*)', r'\1\n\2', formatted, flags=re.MULTILINE)

        # Ensure proper spacing after sentences that end sections
        formatted = re.sub(r'([.!?])\s*(\*\*[^*]+\*\*)', r'\1\n\n\2', formatted)

        # Clean up excessive newlines (more than 2 consecutive)
        formatted = re.sub(r'\n{3,}', '\n\n', formatted)

        # Ensure each major section starts on a new line
        sections = ['Summary', 'Definition of Done', 'Key Validation Path', 'Disclaimer']
        for section in sections:
            pattern = rf'(\S)\s*(\*\*{section}[^*]*\*\*)'
            formatted = re.sub(pattern, r'\1\n\n\2', formatted)

        return formatted



    async def generate_dod_summary(
        self,
        task_description: str,
    ) -> Dict[str, Any]:
        """Generate Definition of Done summary based on task description."""
        try:
            prompt_config = jira_prompts.DEFINITION_OF_DONE
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1000,
                temperature=0.5,
            )

            if result.get("success"):
                # Ensure proper formatting of the generated content
                generated_text = result["text"]
                formatted_content = self._format_dod_content(generated_text)
                result["generated_content"] = formatted_content
                result["suggestions"] = prompt_config["suggestions"]
                del result["text"]  # Remove original key to match expected format

            logger.info("Jira Definition of Done summary generated successfully")
            return result

        except Exception as e:
            logger.error(f"Jira Definition of Done summary generation failed: {str(e)}")
            return {
                "generated_content": "",
                "suggestions": [],
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    def _format_summary_content(self, content: str) -> str:
        """Format ticket summary content to ensure proper structure and readability."""
        if not content:
            return content

        import re

        # Clean up the content
        formatted = content.strip()

        # Ensure proper spacing between sections (headers)
        formatted = re.sub(r'(\*\*[^*]+\*\*)\s*([^\n*])', r'\1\n\n\2', formatted)

        # Ensure proper spacing between list items
        formatted = re.sub(r'^(\s*-\s+.*?)(\s*-\s+)', r'\1\n\2', formatted, flags=re.MULTILINE)

        # Ensure proper spacing after sentences that end sections
        formatted = re.sub(r'([.!?])\s*(\*\*[^*]+\*\*)', r'\1\n\n\2', formatted)

        # Clean up excessive newlines (more than 2 consecutive)
        formatted = re.sub(r'\n{3,}', '\n\n', formatted)

        # Ensure each major section starts on a new line
        sections = ['Executive Summary', 'Key Problem', 'Current Status', 'Important Decisions',
                   'Action Items', 'Risks', 'Technical Notes', 'Stakeholder Impact']
        for section in sections:
            pattern = rf'(\S)\s*(\*\*{section}[^*]*\*\*)'
            formatted = re.sub(pattern, r'\1\n\n\2', formatted)

        return formatted

    async def generate_ticket_summary(
        self,
        issue_key: str,
    ) -> Dict[str, Any]:
        """Generate comprehensive ticket summary based on issue key."""
        try:
            logger.info(f"Generating ticket summary for issue: {issue_key}")

            # Get ticket data from Jira API
            async with jira_api_client as client:
                ticket_data = await client.get_issue_details(
                    issue_key=issue_key,
                    include_comments=True,
                    include_attachments=False
                )

                if not ticket_data.get("success"):
                    error_msg = ticket_data.get("error", "Failed to fetch ticket data")
                    logger.error(f"Failed to fetch ticket data for {issue_key}: {error_msg}")
                    return {
                        "generated_content": "",  # Use consistent field name
                        "suggestions": [],
                        "model": settings.azure_openai_deployment_name,
                        "tokens_used": 0,
                        "success": False,
                        "error": f"Failed to fetch ticket data: {error_msg}",
                    }

            # Extract and format ticket information
            issue_data = ticket_data.get("issue", {})
            formatted_ticket_data = {
                "title": issue_data.get("summary", "N/A"),
                "description": issue_data.get("description", "N/A"),
                "status": issue_data.get("status", "N/A"),
                "priority": issue_data.get("priority", "N/A"),
                "assignee": issue_data.get("assignee", "Unassigned"),
                "created": issue_data.get("created", "N/A"),
                "updated": issue_data.get("updated", "N/A"),
                "comments": issue_data.get("comments", [])
            }

            # Generate summary using AI
            prompt_config = jira_prompts.TICKET_SUMMARY
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(formatted_ticket_data)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.3,
            )

            if result.get("success"):
                # Ensure proper formatting of the generated content
                generated_text = result["text"]
                formatted_content = self._format_summary_content(generated_text)
                result["generated_content"] = formatted_content  # Use consistent field name
                result["suggestions"] = prompt_config["suggestions"]
                del result["text"]  # Remove original key to match expected format

            logger.info(f"Jira ticket summary generated successfully for {issue_key}")
            return result

        except Exception as e:
            logger.error(f"Jira ticket summary generation failed for {issue_key}: {str(e)}")
            return {
                "generated_content": "",  # Use consistent field name
                "suggestions": [],
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }


# Global Jira service instance
jira_service = JiraService()