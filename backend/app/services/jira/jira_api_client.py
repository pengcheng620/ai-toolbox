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
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

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
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

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
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

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
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

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
        story_points: float = 0.0
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
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

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

    async def get_issue_details(self, issue_key: str, include_comments: bool = True, include_attachments: bool = True) -> Dict[str, Any]:
        """Get detailed information for a specific issue including comments, links, and attachments."""
        if not settings.jira_api_enabled:
            raise ValueError("Jira API is not enabled or properly configured")
        
        if not self.session:
            raise ValueError("Session not initialized. Use 'async with' context manager.")

        try:
            # Build expand parameters to get additional details
            expand_params = ["renderedFields", "names", "schema", "transitions", "operations"]
            if include_comments:
                expand_params.append("comments")
            if include_attachments:
                expand_params.append("attachment")
            
            url = f"{self.base_url}/rest/api/2/issue/{issue_key}"
            params = {
                "expand": ",".join(expand_params)
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Parse basic issue information
                    basic_info = self._parse_issue_data(data)
                    
                    # Extract additional details
                    fields = data.get("fields", {})
                    rendered_fields = data.get("renderedFields", {})
                    
                    # Parse comments
                    comments = []
                    if include_comments and "comments" in data.get("fields", {}):
                        comments_data = fields.get("comment", {}).get("comments", [])
                        for comment_data in comments_data:
                            comment = {
                                "id": comment_data.get("id"),
                                "body": comment_data.get("body", ""),
                                "rendered_body": rendered_fields.get("comment", {}).get("comments", [{}])[0].get("body", "") if rendered_fields.get("comment") else "",
                                "author": {
                                    "id": comment_data.get("author", {}).get("accountId", ""),
                                    "name": comment_data.get("author", {}).get("displayName", ""),
                                    "email": comment_data.get("author", {}).get("emailAddress", ""),
                                    "avatar": comment_data.get("author", {}).get("avatarUrls", {}).get("48x48", "")
                                },
                                "created": comment_data.get("created", ""),
                                "updated": comment_data.get("updated", "")
                            }
                            comments.append(comment)
                    
                    # Parse attachments
                    attachments = []
                    if include_attachments and "attachment" in fields:
                        for attachment_data in fields.get("attachment", []):
                            attachment = {
                                "id": attachment_data.get("id"),
                                "filename": attachment_data.get("filename", ""),
                                "size": attachment_data.get("size", 0),
                                "mime_type": attachment_data.get("mimeType", ""),
                                "content_url": attachment_data.get("content", ""),
                                "thumbnail_url": attachment_data.get("thumbnail", ""),
                                "author": {
                                    "id": attachment_data.get("author", {}).get("accountId", ""),
                                    "name": attachment_data.get("author", {}).get("displayName", "")
                                },
                                "created": attachment_data.get("created", "")
                            }
                            attachments.append(attachment)
                    
                    # Parse issue links
                    issue_links = []
                    if "issuelinks" in fields:
                        for link_data in fields.get("issuelinks", []):
                            link_type = link_data.get("type", {})
                            link = {
                                "id": link_data.get("id"),
                                "type": {
                                    "name": link_type.get("name", ""),
                                    "inward": link_type.get("inward", ""),
                                    "outward": link_type.get("outward", "")
                                }
                            }
                            
                            # Add linked issue information
                            if "inwardIssue" in link_data:
                                linked_issue = link_data["inwardIssue"]
                                link["direction"] = "inward"
                                link["linked_issue"] = {
                                    "key": linked_issue.get("key", ""),
                                    "summary": linked_issue.get("fields", {}).get("summary", ""),
                                    "status": linked_issue.get("fields", {}).get("status", {}).get("name", ""),
                                    "issue_type": linked_issue.get("fields", {}).get("issuetype", {}).get("name", "")
                                }
                            elif "outwardIssue" in link_data:
                                linked_issue = link_data["outwardIssue"]
                                link["direction"] = "outward"
                                link["linked_issue"] = {
                                    "key": linked_issue.get("key", ""),
                                    "summary": linked_issue.get("fields", {}).get("summary", ""),
                                    "status": linked_issue.get("fields", {}).get("status", {}).get("name", ""),
                                    "issue_type": linked_issue.get("fields", {}).get("issuetype", {}).get("name", "")
                                }
                            
                            issue_links.append(link)
                    
                    # Parse subtasks
                    subtasks = []
                    if "subtasks" in fields:
                        for subtask_data in fields.get("subtasks", []):
                            subtask = {
                                "id": subtask_data.get("id"),
                                "key": subtask_data.get("key"),
                                "summary": subtask_data.get("fields", {}).get("summary", ""),
                                "status": subtask_data.get("fields", {}).get("status", {}).get("name", ""),
                                "issue_type": subtask_data.get("fields", {}).get("issuetype", {}).get("name", ""),
                                "assignee": None
                            }
                            
                            # Parse subtask assignee
                            assignee_data = subtask_data.get("fields", {}).get("assignee")
                            if assignee_data:
                                subtask["assignee"] = {
                                    "id": assignee_data.get("accountId", ""),
                                    "name": assignee_data.get("displayName", ""),
                                    "avatar": assignee_data.get("avatarUrls", {}).get("48x48", "")
                                }
                            
                            subtasks.append(subtask)
                    
                    # Combine all information
                    detailed_info = {
                        **basic_info,
                        "description_rendered": rendered_fields.get("description", ""),
                        "environment": fields.get("environment", ""),
                        "environment_rendered": rendered_fields.get("environment", ""),
                        "comments": comments,
                        "comments_count": len(comments),
                        "attachments": attachments,
                        "attachments_count": len(attachments),
                        "issue_links": issue_links,
                        "issue_links_count": len(issue_links),
                        "subtasks": subtasks,
                        "subtasks_count": len(subtasks),
                        "votes": fields.get("votes", {}).get("votes", 0),
                        "watches": fields.get("watches", {}).get("watchCount", 0),
                        "url": f"{self.base_url}/browse/{issue_key}",
                        "success": True
                    }
                    
                    return detailed_info
                    
                elif response.status == 404:
                    return {
                        "success": False,
                        "error": f"Issue {issue_key} not found"
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"API error {response.status}: {error_text}"
                    }

        except Exception as e:
            logger.error(f"Failed to get detailed info for issue {issue_key}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Global Jira API client instance
jira_api_client = JiraAPIClient() 