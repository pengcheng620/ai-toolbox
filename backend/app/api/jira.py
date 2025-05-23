"""Jira API endpoints."""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.jira_service import jira_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class JiraCommentRequest(BaseModel):
    """Request model for Jira comment generation."""

    task_description: str = Field(..., description="Jira task description")
    task_type: str = Field(default="development", description="Type of task")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


class JiraAcceptanceCriteriaRequest(BaseModel):
    """Request model for Jira acceptance criteria generation."""

    task_description: str = Field(..., description="Task description")
    user_story: str = Field(default="", description="User story (optional)")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


class JiraEffortEstimationRequest(BaseModel):
    """Request model for Jira effort estimation."""

    task_description: str = Field(..., description="Task description")
    task_type: str = Field(default="development", description="Type of task")
    team_velocity: Optional[int] = Field(default=None, description="Team velocity")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


# Response models
class JiraCommentResponse(BaseModel):
    """Response model for Jira comment generation."""

    generated_content: str
    suggestions: List[str]
    model: str
    tokens_used: int
    error: str = ""


class JiraAcceptanceCriteriaResponse(BaseModel):
    """Response model for Jira acceptance criteria generation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class JiraEffortEstimationResponse(BaseModel):
    """Response model for Jira effort estimation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


# Endpoints
@router.post("/comment", response_model=JiraCommentResponse)
async def generate_jira_comment(request: JiraCommentRequest):
    """Generate Jira task comment using specialized AI prompt."""
    try:
        logger.info(f"Generating Jira comment for task type: {request.task_type}")

        result = await jira_service.generate_task_comment(
            task_description=request.task_description,
            task_type=request.task_type,
            context=request.context,
        )

        return JiraCommentResponse(**result)

    except Exception as e:
        logger.error(f"Jira comment generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/acceptance-criteria", response_model=JiraAcceptanceCriteriaResponse)
async def generate_acceptance_criteria(request: JiraAcceptanceCriteriaRequest):
    """Generate acceptance criteria for Jira task."""
    try:
        logger.info(f"Generating acceptance criteria for task")

        result = await jira_service.generate_acceptance_criteria(
            task_description=request.task_description,
            user_story=request.user_story or None,
            context=request.context,
        )

        return JiraAcceptanceCriteriaResponse(**result)

    except Exception as e:
        logger.error(f"Jira acceptance criteria generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/estimate", response_model=JiraEffortEstimationResponse)
async def estimate_task_effort(request: JiraEffortEstimationRequest):
    """Estimate effort for Jira task."""
    try:
        logger.info(f"Estimating effort for task type: {request.task_type}")

        result = await jira_service.estimate_task_effort(
            task_description=request.task_description,
            task_type=request.task_type,
            team_velocity=request.team_velocity,
            context=request.context,
        )

        return JiraEffortEstimationResponse(**result)

    except Exception as e:
        logger.error(f"Jira effort estimation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoint for backward compatibility
@router.post("/generate", response_model=JiraCommentResponse)
async def generate_jira_legacy(request: JiraCommentRequest):
    """Legacy endpoint for Jira comment generation (backward compatibility)."""
    return await generate_jira_comment(request) 