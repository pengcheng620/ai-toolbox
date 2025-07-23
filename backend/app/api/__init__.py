"""API package for route handlers."""

from app.api.auth import router as auth_router
from app.api.ai import router as ai_router
from app.api.base import router as base_ai_router
from app.api.chat import router as chat_router
from app.api.jira import router as jira_router
from app.api.github import router as github_router

__all__ = [
    "auth_router",
    "ai_router",
    "base_ai_router",
    "chat_router",
    "jira_router",
    "github_router",
]
