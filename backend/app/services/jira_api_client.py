"""Jira REST API client for Sprint Planning integration."""

import asyncio
import base64
from typing import Dict, List, Any, Optional
import aiohttp
from datetime import datetime, timezone

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class JiraAPIClient:
    """Jira REST API client for Sprint Planning data."""

    def __init__(self):
        """Initialize Jira API client."""
        self.base_url = settings.jira_base_url.rstrip('/')
        self.timeout = settings.jira_api_timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Prepare authentication headers
        if settings.jira_api_enabled:
            if settings.jira_auth_method.lower() == "pat":
                # Personal Access Token authentication (Bearer token)
                self.headers = {
                    'Authorization': f'Bearer {settings.jira_personal_access_token}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
                logger.info("Using Personal Access Token (PAT) authentication")
            else:
                # Basic authentication (username + API token)
                auth_string = f"{settings.jira_username}:{settings.jira_api_token}"
                auth_bytes = auth_string.encode('ascii')
                auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
                self.headers = {
                    'Authorization': f'Basic {auth_b64}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
                logger.info("Using Basic authentication")
        else:
            self.headers = {}
        
        logger.info(f"Jira API client initialized. API enabled: {settings.jira_api_enabled}")

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
            raise ValueError("Jira API is not enabled or properly configured")

        try:
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "board_id": str(data["id"]),
                        "board_name": data["name"],
                        "board_type": data["type"],
                        "project_key": data.get("location", {}).get("projectKey", ""),
                        "project_name": data.get("location", {}).get("projectName", ""),
                        "success": True
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

    async def get_board_sprints(self, board_id: str, state: Optional[str] = None) -> Dict[str, Any]:
        """Get sprints for a board."""
        if not settings.jira_api_enabled:
            raise ValueError("Jira API is not enabled or properly configured")

        try:
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/sprint"
            params = {}
            if state:
                params['state'] = state

            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    sprints = []
                    
                    for sprint_data in data.get("values", []):
                        sprint = {
                            "id": str(sprint_data["id"]),
                            "name": sprint_data["name"],
                            "state": sprint_data["state"],
                            "board_id": board_id,
                            "start_date": sprint_data.get("startDate"),
                            "end_date": sprint_data.get("endDate"),
                            "complete_date": sprint_data.get("completeDate"),
                            "goal": sprint_data.get("goal", "")
                        }
                        sprints.append(sprint)
                    
                    return {
                        "sprints": sprints,
                        "total": data.get("total", len(sprints)),
                        "success": True
                    }
                else:
                    error_text = await response.text()
                    return {
                        "sprints": [],
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get sprints for board {board_id}: {str(e)}")
            return {
                "sprints": [],
                "success": False,
                "error": str(e)
            }

    async def get_sprint_issues(self, sprint_id: str) -> Dict[str, Any]:
        """Get issues for a specific sprint."""
        if not settings.jira_api_enabled:
            raise ValueError("Jira API is not enabled or properly configured")

        try:
            url = f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
            
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
                        "success": True
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

    async def get_board_configuration(self, board_id: str) -> Dict[str, Any]:
        """Get board configuration including columns and estimation settings."""
        if not settings.jira_api_enabled:
            raise ValueError("Jira API is not enabled or properly configured")

        try:
            url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/configuration"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "board_id": board_id,
                        "estimation": data.get("estimation", {}),
                        "columns": data.get("columnConfig", {}).get("columns", []),
                        "ranking": data.get("ranking", {}),
                        "success": True
                    }
                else:
                    error_text = await response.text()
                    return {
                        "board_id": board_id,
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get board configuration for {board_id}: {str(e)}")
            return {
                "board_id": board_id,
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
                "avatar": assignee_data.get("avatarUrls", {}).get("48x48", ""),
                "email_address": assignee_data.get("emailAddress", "")
            }

        # Parse reporter
        reporter_data = fields.get("reporter")
        reporter = None
        if reporter_data:
            reporter = {
                "id": reporter_data.get("accountId", reporter_data.get("name", "")),
                "name": reporter_data.get("displayName", reporter_data.get("name", "")),
                "display_name": reporter_data.get("displayName", ""),
                "avatar": reporter_data.get("avatarUrls", {}).get("48x48", "")
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

        # Extract story points
        story_points = 0
        # Common custom field names for story points
        story_point_fields = ["customfield_10004", "customfield_10008", "customfield_10002"]
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
            "reporter": reporter,
            "priority": priority,
            "story_points": story_points,
            "original_estimate": fields.get("timeoriginalestimate"),
            "remaining_estimate": fields.get("timeestimate"),
            "time_spent": fields.get("timespent"),
            "labels": fields.get("labels", []),
            "components": [{"id": c["id"], "name": c["name"]} for c in fields.get("components", [])],
            "fix_versions": [{"id": v["id"], "name": v["name"]} for v in fields.get("fixVersions", [])],
            "created": fields.get("created", ""),
            "updated": fields.get("updated", "")
        }

    async def search_issues(self, jql: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """Search issues using JQL."""
        if not settings.jira_api_enabled:
            raise ValueError("Jira API is not enabled or properly configured")

        try:
            url = f"{self.base_url}/rest/api/2/search"
            payload = {
                "jql": jql,
                "maxResults": 1000,
                "fields": fields or ["*all"]
            }
            
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    issues = []
                    
                    for issue_data in data.get("issues", []):
                        issues.append(self._parse_issue_data(issue_data))
                    
                    return {
                        "issues": issues,
                        "total": data.get("total", len(issues)),
                        "success": True
                    }
                else:
                    error_text = await response.text()
                    return {
                        "issues": [],
                        "success": False,
                        "error": f"JQL search failed {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to search issues with JQL '{jql}': {str(e)}")
            return {
                "issues": [],
                "success": False,
                "error": str(e)
            }


# Global Jira API client instance
jira_api_client = JiraAPIClient() 