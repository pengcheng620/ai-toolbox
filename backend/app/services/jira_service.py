"""Jira service for AI-powered task management."""

import logging
from typing import Dict, Any, Optional, Callable

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.jira import jira_prompts

logger = get_logger(__name__)


class JiraService(BaseAzureAIService):
    """Jira service for AI-powered task management."""

    def __init__(self):
        """Initialize Jira service."""
        super().__init__()
        logger.info("Jira service initialized")

    async def generate_task_comment(
        self,
        task_description: str,
        task_type: str = "development",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate Jira task comment using specialized prompt."""
        try:
            prompt_config = jira_prompts.TASK_COMMENT
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description, task_type, context)
            
            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.7,
            )

            if result.get("success"):
                result["generated_content"] = result["text"]
                result["suggestions"] = prompt_config["suggestions"]
                del result["text"]  # Remove original key to match expected format

            logger.info("Jira comment generated successfully")
            return result

        except Exception as e:
            logger.error(f"Jira comment generation failed: {str(e)}")
            return {
                "generated_content": "",
                "suggestions": [],
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "error": str(e),
            }

    async def generate_acceptance_criteria(
        self,
        task_description: str,
        user_story: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate acceptance criteria for Jira task."""
        try:
            prompt_config = jira_prompts.ACCEPTANCE_CRITERIA
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description, user_story, context)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.5,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("Jira acceptance criteria generated successfully")
            return result

        except Exception as e:
            logger.error(f"Jira acceptance criteria generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def estimate_task_effort(
        self,
        task_description: str,
        task_type: str = "development",
        team_velocity: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Estimate effort for Jira task."""
        try:
            prompt_config = jira_prompts.EFFORT_ESTIMATION
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description, task_type, team_velocity, context)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1200,
                temperature=0.3,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("Jira task effort estimation completed successfully")
            return result

        except Exception as e:
            logger.error(f"Jira task effort estimation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_summary_for_testers(
        self,
        task_description: str,
    ) -> Dict[str, Any]:
        """Generate summary for testers based on task description."""
        try:
            prompt_config = jira_prompts.SUMMARY_FOR_TESTERS
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

            logger.info("Jira summary for testers generated successfully")
            return result

        except Exception as e:
            logger.error(f"Jira summary for testers generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }


# Global Jira service instance
jira_service = JiraService() 