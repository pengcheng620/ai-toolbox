"""Jira REST API client for Sprint Planning integration."""

import base64
from typing import Dict, List, Any, Optional
import aiohttp

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class JiraRESTClient:
    """Jira REST API client for Sprint Planning data."""

    def __init__(self):
        """Initialize Jira API client."""
        self.base_url = settings.jira_base_url.rstrip('/') if settings.jira_base_url else ""
        self.timeout = settings.jira_api_timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Prepare authentication headers
        if settings.jira_api_enabled:
            auth_string = f"{settings.jira_username}:{settings.jira_api_token}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            self.headers = {
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        else:
            self.headers = {}
        
        logger.info(f"Jira REST client initialized. API enabled: {settings.jira_api_enabled}")

    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout),
            headers=self.headers
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    async def get_board_info(self, board_id: str) -> Dict[str, Any]:
        """Get board information by board ID."""
        if not settings.jira_api_enabled:
            logger.warning("Jira API is not enabled, returning mock data")
            return {
                "board_id": board_id,
                "board_name": f"Board {board_id}",
                "project_key": f"PROJ-{board_id[:3].upper()}",
                "success": True,
                "data_source": "mock"
            }

        try:
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}"
            
            if not self.session:
                raise ValueError("Session not initialized. Use async context manager.")
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "board_id": str(data["id"]),
                        "board_name": data["name"],
                        "board_type": data["type"],
                        "project_key": data.get("location", {}).get("projectKey", ""),
                        "project_name": data.get("location", {}).get("projectName", ""),
                        "success": True,
                        "data_source": "api"
                    }
                elif response.status == 404:
                    return {
                        "board_id": board_id,
                        "success": False,
                        "error": f"Board {board_id} not found"
                    }
                else:
                    error_text = await response.text()
                    return {
                        "board_id": board_id,
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get board info for {board_id}: {str(e)}")
            return {
                "board_id": board_id,
                "success": False,
                "error": str(e)
            }

    async def get_active_sprint(self, board_id: str) -> Dict[str, Any]:
        """Get active sprint for a board."""
        if not settings.jira_api_enabled:
            logger.warning("Jira API is not enabled, returning mock data")
            return {
                "sprint_id": f"sprint-{board_id}-active",
                "sprint_name": "Current Sprint",
                "sprint_state": "active",
                "board_id": board_id,
                "success": True,
                "data_source": "mock"
            }

        try:
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/sprint"
            params = {"state": "active"}

            if not self.session:
                raise ValueError("Session not initialized. Use async context manager.")

            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    sprints = data.get("values", [])
                    
                    if sprints:
                        sprint_data = sprints[0]  # Get first active sprint
                        return {
                            "sprint_id": str(sprint_data["id"]),
                            "sprint_name": sprint_data["name"],
                            "sprint_state": sprint_data["state"],
                            "board_id": board_id,
                            "start_date": sprint_data.get("startDate"),
                            "end_date": sprint_data.get("endDate"),
                            "goal": sprint_data.get("goal", ""),
                            "success": True,
                            "data_source": "api"
                        }
                    else:
                        return {
                            "board_id": board_id,
                            "success": False,
                            "error": "No active sprint found"
                        }
                else:
                    error_text = await response.text()
                    return {
                        "board_id": board_id,
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get active sprint for board {board_id}: {str(e)}")
            return {
                "board_id": board_id,
                "success": False,
                "error": str(e)
            }

    async def get_sprint_issues(self, sprint_id: str) -> Dict[str, Any]:
        """Get issues for a specific sprint."""
        if not settings.jira_api_enabled:
            logger.warning("Jira API is not enabled, returning mock data")
            return {
                "sprint_id": sprint_id,
                "issues": [],
                "total_story_points": 0,
                "total_issues": 0,
                "success": True,
                "data_source": "mock"
            }

        try:
            url = f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
            
            if not self.session:
                raise ValueError("Session not initialized. Use async context manager.")
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    issues = []
                    total_story_points = 0
                    
                    for issue_data in data.get("issues", []):
                        issue = self._parse_issue_data(issue_data)
                        issues.append(issue)
                        total_story_points += issue.get("story_points", 0)
                    
                    return {
                        "sprint_id": sprint_id,
                        "issues": issues,
                        "total_story_points": total_story_points,
                        "total_issues": len(issues),
                        "success": True,
                        "data_source": "api"
                    }
                else:
                    error_text = await response.text()
                    return {
                        "sprint_id": sprint_id,
                        "issues": [],
                        "total_story_points": 0,
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get issues for sprint {sprint_id}: {str(e)}")
            return {
                "sprint_id": sprint_id,
                "issues": [],
                "total_story_points": 0,
                "success": False,
                "error": str(e)
            }

    def _parse_issue_data(self, issue_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Jira issue data into standardized format."""
        fields = issue_data.get("fields", {})
        
        # Parse assignee
        assignee_data = fields.get("assignee")
        assignee = None
        if assignee_data:
            assignee = {
                "id": assignee_data.get("accountId", assignee_data.get("name", "")),
                "name": assignee_data.get("displayName", assignee_data.get("name", "")),
                "display_name": assignee_data.get("displayName", ""),
                "avatar": assignee_data.get("avatarUrls", {}).get("48x48", "")
            }

        # Parse issue type
        issue_type_data = fields.get("issuetype", {})
        issue_type = {
            "id": issue_type_data.get("id", ""),
            "name": issue_type_data.get("name", "Unknown"),
            "icon_url": issue_type_data.get("iconUrl", "")
        }

        # Parse status
        status_data = fields.get("status", {})
        status = {
            "id": status_data.get("id", ""),
            "name": status_data.get("name", "Unknown"),
            "status_category": status_data.get("statusCategory", {}).get("key", "new")
        }

        # Parse priority
        priority_data = fields.get("priority", {})
        priority = {
            "id": priority_data.get("id", ""),
            "name": priority_data.get("name", "Medium"),
            "icon_url": priority_data.get("iconUrl", "")
        }

        # Extract story points (common custom field names)
        story_points = 0
        story_point_fields = [
            "customfield_10004",  # Common story points field
            "customfield_10008",  # Alternative story points field
            "customfield_10002",  # Another common field
            "customfield_10016",  # Jira Software story points
        ]
        for field_name in story_point_fields:
            if field_name in fields and fields[field_name] is not None:
                try:
                    story_points = float(fields[field_name])
                    break
                except (ValueError, TypeError):
                    continue

        return {
            "id": issue_data["id"],
            "key": issue_data["key"],
            "summary": fields.get("summary", ""),
            "description": fields.get("description", ""),
            "issue_type": issue_type,
            "status": status,
            "assignee": assignee,
            "priority": priority,
            "story_points": story_points,
            "labels": fields.get("labels", []),
            "components": [{"id": c["id"], "name": c["name"]} for c in fields.get("components", [])],
            "created": fields.get("created", ""),
            "updated": fields.get("updated", "")
        }

    async def get_project_users(self, project_key: str) -> Dict[str, Any]:
        """Get users assigned to a project."""
        if not settings.jira_api_enabled:
            logger.warning("Jira API is not enabled, returning mock data")
            return {
                "users": [],
                "success": True,
                "data_source": "mock"
            }

        try:
            # Get project assignable users
            url = f"{self.base_url}/rest/api/2/user/assignable/search"
            params = {
                "project": project_key,
                "maxResults": 50
            }
            
            if not self.session:
                raise ValueError("Session not initialized. Use async context manager.")
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    users = []
                    
                    for user_data in data:
                        user = {
                            "id": user_data.get("accountId", user_data.get("name", "")),
                            "name": user_data.get("displayName", user_data.get("name", "")),
                            "display_name": user_data.get("displayName", ""),
                            "avatar": user_data.get("avatarUrls", {}).get("48x48", ""),
                            "email_address": user_data.get("emailAddress", ""),
                            "active": user_data.get("active", True)
                        }
                        users.append(user)
                    
                    return {
                        "users": users,
                        "total": len(users),
                        "success": True,
                        "data_source": "api"
                    }
                else:
                    error_text = await response.text()
                    return {
                        "users": [],
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get project users for {project_key}: {str(e)}")
            return {
                "users": [],
                "success": False,
                "error": str(e)
            }


# Global Jira REST client instance
jira_rest_client = JiraRESTClient() 