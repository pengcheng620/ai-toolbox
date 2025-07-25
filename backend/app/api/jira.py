"""Jira API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.services.jira.jira_service import jira_service
from app.services.jira.jira_api_client import jira_api_client
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class JiraDoDefinitionRequest(BaseModel):
    """Request model for Jira Definition of Done generation."""

    task_description: str = Field(..., description="Jira task description")
    stream: bool = Field(default=False, description="Whether to stream the response")


# Response models
class JiraDoDefinitionResponse(BaseModel):
    """Response model for Jira Definition of Done generation."""

    generated_content: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool = True
    error: str = ""


class JiraIssueDetailsResponse(BaseModel):
    """Response model for Jira Issue details."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    class Config:
        arbitrary_types_allowed = True


# Endpoints
@router.post("/definition-of-done", response_model=JiraDoDefinitionResponse)
async def generate_definition_of_done(request: JiraDoDefinitionRequest):
    """Generate Definition of Done summary based on task description."""
    try:
        logger.info("Generating Jira Definition of Done summary")

        result = await jira_service.generate_dod_summary(
            task_description=request.task_description
        )

        return JiraDoDefinitionResponse(**result)

    except Exception as e:
        logger.error(f"Jira Definition of Done generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issue/{issue_key}/details", response_model=JiraIssueDetailsResponse)
async def get_issue_details(
    issue_key: str,
    include_comments: bool = Query(default=True, description="Include comments in the response"),
    include_attachments: bool = Query(default=True, description="Include attachments in the response")
):
    """Get detailed information for a specific Jira issue including comments, links, and attachments."""
    try:
        logger.info(f"Getting detailed information for issue: {issue_key}")

        async with jira_api_client as client:
            result = await client.get_issue_details(
                issue_key=issue_key,
                include_comments=include_comments,
                include_attachments=include_attachments
            )

        if result.get("success"):
            return JiraIssueDetailsResponse(
                success=True,
                data=result
            )
        else:
            return JiraIssueDetailsResponse(
                success=False,
                error=result.get("error", "Unknown error occurred")
            )

    except Exception as e:
        logger.error(f"Failed to get issue details for {issue_key}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issue/{issue_key}/basic")
async def get_issue_basic(issue_key: str):
    """Get basic information for a specific Jira issue (lightweight version)."""
    try:
        logger.info(f"Getting basic information for issue: {issue_key}")

        async with jira_api_client as client:
            result = await client.get_issue_details(
                issue_key=issue_key,
                include_comments=False,
                include_attachments=False
            )

        if result.get("success"):
            # Return only basic fields for lightweight response
            basic_data = {
                "key": result.get("key"),
                "summary": result.get("summary"),
                "description": result.get("description"),
                "status": result.get("status"),
                "issue_type": result.get("issue_type"),
                "priority": result.get("priority"),
                "assignee": result.get("assignee"),
                "reporter": result.get("reporter"),
                "created": result.get("created"),
                "updated": result.get("updated"),
                "url": result.get("url"),
                "story_points": result.get("story_points"),
                "labels": result.get("labels", [])
            }
            
            return JiraIssueDetailsResponse(
                success=True,
                data=basic_data
            )
        else:
            return JiraIssueDetailsResponse(
                success=False,
                error=result.get("error", "Unknown error occurred")
            )

    except Exception as e:
        logger.error(f"Failed to get basic issue info for {issue_key}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoint for backward compatibility
@router.post("/generate")
async def generate_jira_legacy(request: JiraDoDefinitionRequest):
    """Legacy endpoint for Jira Definition of Done generation with streaming support."""
    if request.stream:
        # Return streaming response
        from fastapi.responses import StreamingResponse

        async def generate_stream():
            try:
                # Generate Definition of Done summary using the service
                result = await jira_service.generate_dod_summary(
                    task_description=request.task_description
                )

                if result.get("success"):
                    content = result.get("generated_content", "")

                    # Simulate streaming by sending chunks while preserving line breaks
                    import asyncio
                    import re

                    # Split content into tokens while preserving whitespace and line breaks
                    tokens = re.findall(r'\S+|\s+', content)

                    chunk_size = 3  # Send every 3 tokens
                    for i in range(0, len(tokens), chunk_size):
                        chunk_tokens = tokens[i:i + chunk_size]
                        chunk = "".join(chunk_tokens)  # Preserve original spacing and line breaks
                        yield f"data: {chunk}\n\n"
                        await asyncio.sleep(0.1)  # Simulate typing delay

                    yield "data: [DONE]\n\n"
                else:
                    yield f"data: Error: {result.get('error', 'Unknown error')}\n\n"

            except Exception as e:
                yield f"data: Error: {str(e)}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
    else:
        # For non-streaming, return complete response
        try:
            result = await jira_service.generate_dod_summary(
                task_description=request.task_description
            )

            return JiraDoDefinitionResponse(**result)

        except Exception as e:
            logger.error(f"Jira Definition of Done generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))


