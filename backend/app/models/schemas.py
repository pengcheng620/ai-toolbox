"""Pydantic schemas for API requests and responses."""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# Base schemas
class BaseResponse(BaseModel):
    """Base response schema."""

    success: bool = True
    message: Optional[str] = None


class ErrorResponse(BaseResponse):
    """Error response schema."""

    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict] = None


# AI Service schemas
class AIGenerateRequest(BaseModel):
    """Request schema for AI text generation."""

    prompt: str = Field(..., description="The prompt for AI generation", min_length=1)
    model: Optional[str] = Field(default="gpt-4o", description="AI model to use")
    max_tokens: Optional[int] = Field(
        default=1000, description="Maximum tokens to generate"
    )
    temperature: Optional[float] = Field(
        default=0.7, description="Generation temperature", ge=0.0, le=2.0
    )
    context: Optional[Dict] = Field(default=None, description="Additional context")


class AIGenerateResponse(BaseResponse):
    """Response schema for AI text generation."""

    text: str = Field(..., description="Generated text")
    model: str = Field(..., description="Model used for generation")
    tokens_used: Optional[int] = Field(None, description="Number of tokens used")


# Jira specific schemas
class JiraTaskRequest(BaseModel):
    """Request schema for Jira task processing."""

    task_description: str = Field(..., description="Jira task description")
    task_type: Optional[str] = Field(default="comment", description="Type of task")
    additional_context: Optional[Dict] = Field(
        default=None, description="Additional context"
    )


class JiraTaskResponse(BaseResponse):
    """Response schema for Jira task processing."""

    generated_content: str = Field(..., description="Generated content for Jira")
    suggestions: Optional[List[str]] = Field(
        default=None, description="Additional suggestions"
    )


# GitHub specific schemas
class GitHubPRRequest(BaseModel):
    """Request schema for GitHub PR processing."""

    pr_description: str = Field(..., description="Pull request description")
    code_changes: Optional[str] = Field(
        default=None, description="Code changes summary"
    )
    additional_context: Optional[Dict] = Field(
        default=None, description="Additional context"
    )


class GitHubPRResponse(BaseResponse):
    """Response schema for GitHub PR processing."""

    generated_description: str = Field(..., description="Generated PR description")
    suggested_title: Optional[str] = Field(
        default=None, description="Suggested PR title"
    )


# Authentication schemas
class LoginRequest(BaseModel):
    """Request schema for user login."""

    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class LoginResponse(BaseResponse):
    """Response schema for user login."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class UserInfo(BaseModel):
    """User information schema."""

    id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: Optional[str] = Field(default=None, description="User email")
    is_active: bool = Field(default=True, description="User active status")
    created_at: Optional[str] = Field(default=None, description="Account creation time")


# Usage tracking schemas
class UsageStats(BaseModel):
    """Usage statistics schema."""

    total_requests: int = Field(..., description="Total requests made")
    tokens_used: int = Field(..., description="Total tokens used")
    last_request: Optional[str] = Field(
        default=None, description="Last request timestamp"
    )
