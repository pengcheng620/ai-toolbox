"""GitHub API endpoints."""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.github_service import github_service
from app.services.github_api_client import github_api_client
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


class GitHubPRFromJiraRequest(BaseModel):
    """Request model for generating GitHub PR description from a Jira ticket."""

    jira_ticket_id: str = Field(..., description="Jira ticket ID, e.g., 'PROJ-123'")
    pr_title: str = Field(..., description="Pull Request title")
    code_changes: str = Field(..., description="Code changes summary/diff")
    branch_name: str = Field(default="", description="Branch name")
    commit_messages: List[str] = Field(
        default_factory=list, description="List of commit messages from the PR"
    )
    description_template: str = Field(
        default="", description="The existing PR description to use as a template."
    )
    user_token: Optional[str] = Field(None, description="Optional user GitHub token for private repository access")


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


# New request/response models for GitHub API integration
class GitHubPRDataRequest(BaseModel):
    """Request model for fetching GitHub PR data via API."""

    pr_url: str = Field(..., description="GitHub PR URL")
    user_token: Optional[str] = Field(None, description="Optional user GitHub token for private repository access")


class GitHubPRDataResponse(BaseModel):
    """Response model for GitHub PR data."""

    success: bool
    pr_info: Optional[Dict[str, Any]] = None
    files_data: Optional[Dict[str, Any]] = None
    commits_data: Optional[Dict[str, Any]] = None
    formatted_changes: str = ""
    formatted_commits: List[str] = []
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


@router.post("/pr-from-jira", response_model=GitHubPRResponse)
async def generate_pr_description_from_jira(request: GitHubPRFromJiraRequest):
    """Generate GitHub PR description from Jira ticket and code changes."""
    try:
        logger.info(
            f"Generating GitHub PR description from Jira ticket: {request.jira_ticket_id}"
        )

        # Check if streaming is requested
        stream = getattr(request, 'stream', False)

        if stream:
            # Return streaming response
            from fastapi.responses import StreamingResponse

            async def generate_stream():
                try:
                    # Get the generator from the service
                    async for chunk in github_service.generate_pr_description_from_jira_stream(
                        jira_ticket_id=request.jira_ticket_id,
                        pr_title=request.pr_title,
                        code_changes=request.code_changes,
                        branch_name=request.branch_name,
                        commit_messages=request.commit_messages,
                        description_template=getattr(request, 'description_template', ''),
                    ):
                        yield f"data: {chunk}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as e:
                    logger.error(f"Streaming error: {str(e)}")
                    yield f"data: Error: {str(e)}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate_stream(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            # Return standard JSON response
            result = await github_service.generate_pr_description_from_jira(
                jira_ticket_id=request.jira_ticket_id,
                pr_title=request.pr_title,
                code_changes=request.code_changes,
                branch_name=request.branch_name,
                commit_messages=request.commit_messages,
                description_template=getattr(request, 'description_template', ''),
            )

            if not result.get("success"):
                raise HTTPException(status_code=404, detail=result.get("error"))

            return GitHubPRResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"GitHub PR description generation from Jira failed: {str(e)}"
        )
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


@router.post("/pr-data", response_model=GitHubPRDataResponse)
async def fetch_pr_data(request: GitHubPRDataRequest):
    """Fetch GitHub PR data using GitHub REST API."""
    try:
        logger.info(f"Fetching PR data for URL: {request.pr_url}")
        if request.user_token:
            logger.info("Using user-provided token for authentication")
        else:
            logger.info("Using system token for authentication")

        async with github_api_client as client:
            # Parse PR URL to extract owner, repo, and PR number
            pr_info = client.parse_pr_url(request.pr_url)

            if not pr_info:
                logger.error(f"Invalid PR URL format: {request.pr_url}")
                return GitHubPRDataResponse(
                    success=False,
                    error="Invalid GitHub PR URL format. Please ensure the URL is a valid GitHub PR URL."
                )

            # Fetch PR files and commits in parallel
            import asyncio

            base_url = pr_info.get("base_url", None)

            files_task = client.fetch_pr_files(
                owner=pr_info["owner"],
                repo=pr_info["repo"],
                pr_number=pr_info["pr_number"],
                base_url=base_url,
                user_token=request.user_token
            )

            commits_task = client.fetch_pr_commits(
                owner=pr_info["owner"],
                repo=pr_info["repo"],
                pr_number=pr_info["pr_number"],
                base_url=base_url,
                user_token=request.user_token
            )

            files_result, commits_result = await asyncio.gather(
                files_task, commits_task, return_exceptions=True
            )

            # Handle exceptions and ensure we have dict results
            if isinstance(files_result, Exception):
                logger.error(f"Error fetching files: {str(files_result)}")
                files_result = {"success": False, "error": str(files_result)}
            elif not isinstance(files_result, dict):
                logger.error(f"Unexpected files result type: {type(files_result)}")
                files_result = {"success": False, "error": "Unexpected response format"}

            if isinstance(commits_result, Exception):
                logger.error(f"Error fetching commits: {str(commits_result)}")
                commits_result = {"success": False, "error": str(commits_result)}
            elif not isinstance(commits_result, dict):
                logger.error(f"Unexpected commits result type: {type(commits_result)}")
                commits_result = {"success": False, "error": "Unexpected response format"}

            # Ensure results are dictionaries
            if not isinstance(files_result, dict):
                files_result = {"success": False, "error": "Invalid files result"}
            if not isinstance(commits_result, dict):
                commits_result = {"success": False, "error": "Invalid commits result"}

            # Prepare response
            success = files_result.get("success", False) or commits_result.get("success", False)

            response_data = {
                "success": success,
                "pr_info": pr_info,
                "files_data": files_result if files_result.get("success") else None,
                "commits_data": commits_result if commits_result.get("success") else None,
                "formatted_changes": files_result.get("formatted_changes", ""),
                "formatted_commits": commits_result.get("formatted_commits", []),
                "error": ""
            }

            # Collect errors
            errors = []
            if not files_result.get("success"):
                errors.append(f"Files: {files_result.get('error', 'Unknown error')}")
            if not commits_result.get("success"):
                errors.append(f"Commits: {commits_result.get('error', 'Unknown error')}")

            if errors:
                response_data["error"] = "; ".join(errors)

            return GitHubPRDataResponse(**response_data)

    except Exception as e:
        logger.error(f"GitHub PR data fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))