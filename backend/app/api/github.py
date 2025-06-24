"""GitHub API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.github_service import github_service
from app.services.github_api_client import github_api_client
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models

# Data models matching frontend TypeScript interfaces
class DiffLine(BaseModel):
    """Model for individual diff line matching frontend DiffLine interface."""

    type: str = Field(..., description="Line type: 'add', 'delete', or 'context'")
    oldLineNumber: Optional[int] = Field(None, description="Old line number")
    newLineNumber: Optional[int] = Field(None, description="New line number")
    content: str = Field(..., description="Line content")


class ParsedFile(BaseModel):
    """Model for parsed file changes matching frontend ParsedFile interface."""

    filePath: str = Field(..., description="File path")
    status: str = Field(..., description="File status: 'modified', 'added', 'renamed', 'deleted', or 'unknown'")
    additions: int = Field(default=0, description="Number of added lines")
    deletions: int = Field(default=0, description="Number of deleted lines")
    fileUrl: Optional[str] = Field(None, description="File URL")
    lines: List[DiffLine] = Field(default_factory=list, description="Detailed line-by-line diff")


class ParsedCommit(BaseModel):
    """Model for parsed commit information matching frontend ParsedCommit interface."""

    sha: Optional[str] = Field(None, description="Commit SHA")
    message: str = Field(..., description="Commit message")
    author: Optional[str] = Field(None, description="Commit author")
    date: Optional[str] = Field(None, description="Commit date in ISO 8601 format")
    jiraTicket: Optional[str] = Field(None, description="Associated Jira ticket")
    commitUrl: Optional[str] = Field(None, description="Commit URL")


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
    stream: bool = Field(default=False, description="Enable streaming response")

    # Enhanced data fields for detailed file and commit information
    files_changed: Optional[List[ParsedFile]] = Field(
        None, description="Detailed file changes with line-by-line diffs"
    )
    commits: Optional[List[ParsedCommit]] = Field(
        None, description="Detailed commit information with metadata"
    )


# Response models
class GitHubPRResponse(BaseModel):
    """Response model for GitHub PR description generation."""

    generated_description: str
    suggested_title: str
    model: str
    tokens_used: int
    error: str = ""


# New request/response models for GitHub API integration
class GitHubPRDataRequest(BaseModel):
    """Request model for fetching GitHub PR data via API."""

    pr_url: str = Field(..., description="GitHub PR URL")


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
@router.post("/pr-from-jira", response_model=GitHubPRResponse)
async def generate_pr_description_from_jira(request: GitHubPRFromJiraRequest):
    """Generate GitHub PR description from Jira ticket and code changes."""
    try:
        logger.info(
            f"Generating GitHub PR description from Jira ticket: {request.jira_ticket_id}"
        )

        # Check if streaming is requested
        stream = request.stream

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
                        description_template=request.description_template,
                        files_changed=request.files_changed,
                        commits=request.commits,
                    ):
                        # Preserve newlines in the chunk by encoding them
                        encoded_chunk = chunk.replace('\n', '\\n')
                        yield f"data: {encoded_chunk}\n\n"
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
                description_template=request.description_template,
                files_changed=request.files_changed,
                commits=request.commits,
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


@router.post("/pr-data", response_model=GitHubPRDataResponse)
async def fetch_pr_data(request: GitHubPRDataRequest):
    """Fetch GitHub PR data using GitHub REST API."""
    try:
        logger.info(f"Fetching PR data for URL: {request.pr_url}")
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
                base_url=base_url
            )

            commits_task = client.fetch_pr_commits(
                owner=pr_info["owner"],
                repo=pr_info["repo"],
                pr_number=pr_info["pr_number"],
                base_url=base_url
            )

            files_result_raw, commits_result_raw = await asyncio.gather(
                files_task, commits_task, return_exceptions=True
            )

            # Handle exceptions and ensure we have dict results
            files_result: Dict[str, Any]
            if isinstance(files_result_raw, Exception):  # type: ignore
                logger.error(f"Error fetching files: {str(files_result_raw)}")  # type: ignore
                files_result = {"success": False, "error": str(files_result_raw)}  # type: ignore
            elif not isinstance(files_result_raw, dict):  # type: ignore
                logger.error(f"Unexpected files result type: {type(files_result_raw)}")  # type: ignore
                files_result = {"success": False, "error": "Unexpected response format"}
            else:
                files_result = files_result_raw  # type: ignore

            commits_result: Dict[str, Any]
            if isinstance(commits_result_raw, Exception):  # type: ignore
                logger.error(f"Error fetching commits: {str(commits_result_raw)}")  # type: ignore
                commits_result = {"success": False, "error": str(commits_result_raw)}  # type: ignore
            elif not isinstance(commits_result_raw, dict):  # type: ignore
                logger.error(f"Unexpected commits result type: {type(commits_result_raw)}")  # type: ignore
                commits_result = {"success": False, "error": "Unexpected response format"}
            else:
                commits_result = commits_result_raw  # type: ignore

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