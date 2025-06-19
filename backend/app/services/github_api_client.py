"""GitHub REST API client for fetching PR data."""

import asyncio
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse
import aiohttp
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class GitHubAPIClient:
    """GitHub REST API client for fetching PR and commit data."""
    
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        # Initialize session without headers - we'll add them per request
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
            
    def _get_headers(self, user_token: Optional[str] = None) -> Dict[str, str]:
        """Get headers for GitHub API requests with token priority: user_token > system_token > none."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-Toolbox/1.0"
        }

        # Token priority: user_token > system_token > none
        token_to_use = None
        token_source = "none"

        if user_token:
            token_to_use = user_token
            token_source = "user"
        else:
            system_token = getattr(settings, 'github_api_token', None)
            if system_token:
                token_to_use = system_token
                token_source = "system"

        if token_to_use:
            headers["Authorization"] = f"token {token_to_use}"
            # Log token source and partial token for debugging (security safe)
            token_preview = f"{token_to_use[:8]}..." if len(token_to_use) > 8 else "***"
            logger.info(f"Using GitHub API token from {token_source} source (preview: {token_preview})")
        else:
            logger.warning("No GitHub API token available - using unauthenticated requests")

        return headers
        
    def parse_pr_url(self, pr_url: str) -> Optional[Dict[str, str]]:
        """Parse GitHub PR URL to extract owner, repo, and PR number."""
        try:
            # Support both github.com and git.autodesk.com
            patterns = [
                r'https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)',
                r'https?://git\.autodesk\.com/([^/]+)/([^/]+)/pull/(\d+)',
                r'https?://github\.com/([^/]+)/([^/]+)/pulls/(\d+)',  # Alternative format
            ]
            
            for pattern in patterns:
                match = re.match(pattern, pr_url)
                if match:
                    owner, repo, pr_number = match.groups()
                    
                    # Handle Autodesk GitHub Enterprise
                    base_url = self.base_url
                    if 'git.autodesk.com' in pr_url:
                        base_url = "https://git.autodesk.com/api/v3"
                        
                    return {
                        "owner": owner,
                        "repo": repo,
                        "pr_number": pr_number,
                        "base_url": base_url
                    }
                    
            logger.error(f"Could not parse PR URL: {pr_url}")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing PR URL {pr_url}: {str(e)}")
            return None
            
    async def fetch_pr_files(self, owner: str, repo: str, pr_number: str, base_url: Optional[str] = None, user_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch PR file changes from GitHub API."""
        try:
            if not self.session:
                return {
                    "success": False,
                    "error": "HTTP session not initialized"
                }

            api_base = base_url or self.base_url
            url = f"{api_base}/repos/{owner}/{repo}/pulls/{pr_number}/files"
            headers = self._get_headers(user_token)

            logger.info(f"Fetching PR files from: {url}")

            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    files_data = await response.json()
                    
                    # Process and format the file changes
                    formatted_changes = self._format_file_changes(files_data)
                    
                    return {
                        "success": True,
                        "files": files_data,
                        "formatted_changes": formatted_changes,
                        "total_files": len(files_data)
                    }
                elif response.status == 404:
                    return {
                        "success": False,
                        "error": "PR not found or access denied",
                        "status_code": 404
                    }
                elif response.status == 403:
                    return {
                        "success": False,
                        "error": "API rate limit exceeded or insufficient permissions",
                        "status_code": 403
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"GitHub API error: {response.status} - {error_text}",
                        "status_code": response.status
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching PR files: {str(e)}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
            
    async def fetch_pr_commits(self, owner: str, repo: str, pr_number: str, base_url: Optional[str] = None, user_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch PR commits from GitHub API."""
        try:
            if not self.session:
                return {
                    "success": False,
                    "error": "HTTP session not initialized"
                }

            api_base = base_url or self.base_url
            url = f"{api_base}/repos/{owner}/{repo}/pulls/{pr_number}/commits"
            headers = self._get_headers(user_token)

            logger.info(f"Fetching PR commits from: {url}")

            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    commits_data = await response.json()
                    
                    # Extract commit messages and metadata
                    formatted_commits = self._format_commits(commits_data)
                    
                    return {
                        "success": True,
                        "commits": commits_data,
                        "formatted_commits": formatted_commits,
                        "total_commits": len(commits_data)
                    }
                elif response.status == 404:
                    return {
                        "success": False,
                        "error": "PR not found or access denied",
                        "status_code": 404
                    }
                elif response.status == 403:
                    return {
                        "success": False,
                        "error": "API rate limit exceeded or insufficient permissions",
                        "status_code": 403
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"GitHub API error: {response.status} - {error_text}",
                        "status_code": response.status
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching PR commits: {str(e)}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
            
    def _format_file_changes(self, files_data: List[Dict]) -> str:
        """Format file changes data for AI processing."""
        if not files_data:
            return "No file changes found."
            
        formatted_changes = []
        
        for file_data in files_data:
            filename = file_data.get('filename', 'Unknown file')
            status = file_data.get('status', 'modified')
            additions = file_data.get('additions', 0)
            deletions = file_data.get('deletions', 0)
            changes = file_data.get('changes', 0)
            
            # Add file summary
            formatted_changes.append(f"File: {filename}")
            formatted_changes.append(f"Status: {status}")
            formatted_changes.append(f"Changes: +{additions} -{deletions} (~{changes} total)")
            
            # Add patch content if available (truncated for AI processing)
            patch = file_data.get('patch', '')
            if patch:
                # Limit patch size to avoid overwhelming the AI
                if len(patch) > 2000:
                    patch = patch[:2000] + "\n... (truncated)"
                formatted_changes.append("Diff:")
                formatted_changes.append(patch)
            
            formatted_changes.append("")  # Empty line between files
            
        return "\n".join(formatted_changes)
        
    def _format_commits(self, commits_data: List[Dict]) -> List[str]:
        """Format commit data for AI processing."""
        if not commits_data:
            return ["No commits found."]
            
        formatted_commits = []
        
        for commit_data in commits_data:
            commit = commit_data.get('commit', {})
            message = commit.get('message', 'No commit message')
            author = commit.get('author', {}).get('name', 'Unknown author')
            date = commit.get('author', {}).get('date', 'Unknown date')
            sha = commit_data.get('sha', '')[:8]  # Short SHA
            
            # Format: [sha] message (by author)
            formatted_commit = f"[{sha}] {message.split(chr(10))[0]} (by {author})"
            formatted_commits.append(formatted_commit)
            
        return formatted_commits


# Global GitHub API client instance
github_api_client = GitHubAPIClient()
