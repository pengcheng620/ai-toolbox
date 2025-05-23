"""GitHub API endpoints."""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.github_service import github_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class GitHubPRRequest(BaseModel):
    """Request model for GitHub PR description generation."""

    pr_title: str = Field(..., description="Pull Request title")
    code_changes: str = Field(..., description="Code changes summary")
    branch_name: str = Field(default="", description="Branch name")
    commit_messages: List[str] = Field(
        default_factory=list, description="Commit messages"
    )


class GitHubCommitMessageRequest(BaseModel):
    """Request model for GitHub commit message generation."""

    code_changes: str = Field(..., description="Code changes summary")
    change_type: str = Field(default="feat", description="Change type (feat, fix, docs, etc.)")
    scope: str = Field(default="", description="Change scope (optional)")


class GitHubCodeReviewRequest(BaseModel):
    """Request model for GitHub code review."""

    code_diff: str = Field(..., description="Code diff to review")
    review_focus: str = Field(default="", description="Review focus (optional)")
    programming_language: str = Field(default="", description="Programming language (optional)")


class GitHubReleaseNotesRequest(BaseModel):
    """Request model for GitHub release notes generation."""

    version: str = Field(..., description="Release version")
    commit_messages: List[str] = Field(..., description="Commit messages")
    breaking_changes: List[str] = Field(
        default_factory=list, description="Breaking changes (optional)"
    )


# Response models
class GitHubPRResponse(BaseModel):
    """Response model for GitHub PR description generation."""

    generated_description: str
    suggested_title: str
    model: str
    tokens_used: int
    error: str = ""


class GitHubCommitMessageResponse(BaseModel):
    """Response model for GitHub commit message generation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class GitHubCodeReviewResponse(BaseModel):
    """Response model for GitHub code review."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class GitHubReleaseNotesResponse(BaseModel):
    """Response model for GitHub release notes generation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


# Endpoints
@router.post("/pr", response_model=GitHubPRResponse)
async def generate_github_pr_description(request: GitHubPRRequest):
    """Generate GitHub PR description using specialized AI prompt."""
    try:
        logger.info(f"Generating GitHub PR description for: {request.pr_title}")

        result = await github_service.generate_pr_description(
            pr_title=request.pr_title,
            code_changes=request.code_changes,
            branch_name=request.branch_name,
            commit_messages=request.commit_messages,
        )

        return GitHubPRResponse(**result)

    except Exception as e:
        logger.error(f"GitHub PR description generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/commit", response_model=GitHubCommitMessageResponse)
async def generate_commit_message(request: GitHubCommitMessageRequest):
    """Generate conventional commit message."""
    try:
        logger.info(f"Generating commit message for {request.change_type} changes")

        result = await github_service.generate_commit_message(
            code_changes=request.code_changes,
            change_type=request.change_type,
            scope=request.scope or None,
        )

        return GitHubCommitMessageResponse(**result)

    except Exception as e:
        logger.error(f"GitHub commit message generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review", response_model=GitHubCodeReviewResponse)
async def review_code_changes(request: GitHubCodeReviewRequest):
    """Generate code review comments."""
    try:
        logger.info(f"Reviewing code changes: {len(request.code_diff)} chars")

        result = await github_service.review_code_changes(
            code_diff=request.code_diff,
            review_focus=request.review_focus or None,
            programming_language=request.programming_language or None,
        )

        return GitHubCodeReviewResponse(**result)

    except Exception as e:
        logger.error(f"GitHub code review failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/release-notes", response_model=GitHubReleaseNotesResponse)
async def generate_release_notes(request: GitHubReleaseNotesRequest):
    """Generate release notes from commit messages."""
    try:
        logger.info(f"Generating release notes for version: {request.version}")

        result = await github_service.generate_release_notes(
            version=request.version,
            commit_messages=request.commit_messages,
            breaking_changes=request.breaking_changes,
        )

        return GitHubReleaseNotesResponse(**result)

    except Exception as e:
        logger.error(f"GitHub release notes generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 