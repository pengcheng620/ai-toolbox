"""Jira service for AI-powered Definition of Done (DoD) generation."""

from typing import Dict, Any, Callable

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.jira import jira_prompts

logger = get_logger(__name__)


class JiraService(BaseAzureAIService):
    """Jira service for AI-powered Definition of Done (DoD) generation."""

    def __init__(self):
        """Initialize Jira service."""
        super().__init__()
        logger.info("Jira service initialized")



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
                result["generated_content"] = result["text"]
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


# Global Jira service instance
jira_service = JiraService() 