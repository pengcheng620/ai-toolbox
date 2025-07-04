"""GitHub service for AI-powered code review and PR management."""

import logging
from typing import Dict, Any, List, Optional, Callable, AsyncIterator, TYPE_CHECKING

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger
from app.prompts.github import github_prompts
from app.services.jira.jira_api_client import jira_api_client

# Import types for enhanced data structures
if TYPE_CHECKING:
    from app.api.github import ParsedFile, ParsedCommit

logger = get_logger(__name__)


class GitHubService(BaseAzureAIService):
    """GitHub service for AI-powered code review and PR management."""

    def __init__(self):
        """Initialize GitHub service."""
        super().__init__()
        logger.info("GitHub service initialized")

    def _format_files_changed(self, files_changed: Optional[List["ParsedFile"]], max_files: int = 20, max_lines_per_file: int = 50) -> str:
        """
        Format files_changed data for AI prompt with context length management.

        Args:
            files_changed: List of ParsedFile objects
            max_files: Maximum number of files to include in detail
            max_lines_per_file: Maximum number of diff lines per file

        Returns:
            Formatted string representation of file changes
        """
        if not files_changed:
            return "No detailed file changes provided."

        if len(files_changed) == 0:
            return "No files changed."

        # Sort files by importance: modified files first, then by number of changes
        sorted_files = sorted(
            files_changed,
            key=lambda f: (
                0 if f.status == 'modified' else 1,  # Modified files first
                -(f.additions + f.deletions)  # Then by total changes (descending)
            )
        )

        formatted_parts = []
        formatted_parts.append(f"**FILES CHANGED ({len(files_changed)} total files):**")

        # Include summary for all files
        summary_lines = []
        for file in sorted_files:
            status_emoji = {
                'added': '🆕',
                'modified': '📝',
                'deleted': '🗑️',
                'renamed': '🔄',
                'unknown': '❓'
            }.get(file.status, '📄')

            summary_lines.append(
                f"  {status_emoji} `{file.filePath}` ({file.status}) +{file.additions} -{file.deletions}"
            )

        formatted_parts.append("\n".join(summary_lines))

        # Include detailed diffs for top files (up to max_files)
        if any(file.lines for file in sorted_files[:max_files]):
            formatted_parts.append("\n**DETAILED CHANGES:**")

            for i, file in enumerate(sorted_files[:max_files]):
                if not file.lines:
                    continue

                formatted_parts.append(f"\n📄 **{file.filePath}** ({file.status})")

                # Limit lines per file to manage context length
                lines_to_show = file.lines[:max_lines_per_file]
                if len(file.lines) > max_lines_per_file:
                    formatted_parts.append(f"```diff")
                    for line in lines_to_show:
                        prefix = '+' if line.type == 'add' else '-' if line.type == 'delete' else ' '
                        formatted_parts.append(f"{prefix}{line.content}")
                    formatted_parts.append(f"... ({len(file.lines) - max_lines_per_file} more lines)")
                    formatted_parts.append(f"```")
                else:
                    formatted_parts.append(f"```diff")
                    for line in lines_to_show:
                        prefix = '+' if line.type == 'add' else '-' if line.type == 'delete' else ' '
                        formatted_parts.append(f"{prefix}{line.content}")
                    formatted_parts.append(f"```")

        return "\n".join(formatted_parts)

    def _format_commits(self, commits: Optional[List["ParsedCommit"]], max_commits: int = 15) -> str:
        """
        Format commits data for AI prompt with context length management.

        Args:
            commits: List of ParsedCommit objects
            max_commits: Maximum number of commits to include

        Returns:
            Formatted string representation of commits
        """
        if not commits:
            return "No detailed commit information provided."

        if len(commits) == 0:
            return "No commits found."

        # Sort commits by date (newest first) if date is available
        sorted_commits = sorted(
            commits,
            key=lambda c: c.date or "1970-01-01T00:00:00Z",
            reverse=True
        )

        formatted_parts = []
        formatted_parts.append(f"**COMMITS ({len(commits)} total commits):**")

        for i, commit in enumerate(sorted_commits[:max_commits]):
            commit_info = []

            # Add commit message (required field)
            commit_info.append(f"📝 **{commit.message}**")

            # Add metadata if available
            metadata = []
            if commit.sha:
                short_sha = commit.sha[:8] if len(commit.sha) >= 8 else commit.sha
                metadata.append(f"SHA: `{short_sha}`")
            if commit.author:
                metadata.append(f"Author: {commit.author}")
            if commit.date:
                # Format date to be more readable
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(commit.date.replace('Z', '+00:00'))
                    formatted_date = dt.strftime("%Y-%m-%d %H:%M")
                    metadata.append(f"Date: {formatted_date}")
                except:
                    metadata.append(f"Date: {commit.date}")
            if commit.jiraTicket:
                metadata.append(f"Jira: {commit.jiraTicket}")

            if metadata:
                commit_info.append(f"  _{', '.join(metadata)}_")

            formatted_parts.append("\n".join(commit_info))

        if len(commits) > max_commits:
            formatted_parts.append(f"\n... and {len(commits) - max_commits} more commits")

        return "\n".join(formatted_parts)

    def _estimate_token_count(self, text: str) -> int:
        """
        Rough estimation of token count for context management.
        This is a simple approximation - in production, you might want to use tiktoken or similar.
        """
        # Rough approximation: 1 token ≈ 4 characters for English text
        return len(text) // 4

    def _manage_context_length(
        self,
        jira_summary: str,
        jira_description: str,
        code_changes: str,
        commit_messages_str: str,
        files_changed_str: str,
        commits_str: str,
        description_template: str,
        max_total_tokens: int = 6000  # Leave room for system message and response
    ) -> tuple[str, str, str, str]:
        """
        Manage context length by prioritizing and truncating content as needed.

        Returns:
            Tuple of (final_code_changes, final_commit_messages, final_files_changed, final_commits)
        """
        # Calculate current token usage
        base_tokens = (
            self._estimate_token_count(jira_summary) +
            self._estimate_token_count(jira_description) +
            self._estimate_token_count(description_template)
        )

        available_tokens = max_total_tokens - base_tokens

        # Priority order: code_changes > files_changed > commits > commit_messages
        content_items = [
            ("code_changes", code_changes, 0.4),  # 40% of available tokens
            ("files_changed", files_changed_str, 0.3),  # 30% of available tokens
            ("commits", commits_str, 0.2),  # 20% of available tokens
            ("commit_messages", commit_messages_str, 0.1),  # 10% of available tokens
        ]

        final_content = {}

        for name, content, ratio in content_items:
            max_tokens_for_item = int(available_tokens * ratio)
            current_tokens = self._estimate_token_count(content)

            if current_tokens <= max_tokens_for_item:
                final_content[name] = content
            else:
                # Truncate content
                max_chars = max_tokens_for_item * 4  # Convert back to approximate characters
                if max_chars > 100:  # Only truncate if we have reasonable space
                    truncated = content[:max_chars] + f"\n\n... (truncated from {len(content)} to {max_chars} characters due to context length limits)"
                    final_content[name] = truncated
                else:
                    final_content[name] = f"(Content too large for available context - {current_tokens} tokens needed, {max_tokens_for_item} available)"

        logger.info(f"Context management: Base tokens: {base_tokens}, Available: {available_tokens}")
        for name, content in final_content.items():
            logger.info(f"  {name}: {self._estimate_token_count(content)} tokens")

        return (
            final_content.get("code_changes", ""),
            final_content.get("commit_messages", ""),
            final_content.get("files_changed", ""),
            final_content.get("commits", "")
        )

    async def generate_pr_description(
        self,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate GitHub PR description using specialized prompt."""
        try:
            prompt_config = github_prompts.PR_DESCRIPTION
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(pr_title, code_changes, branch_name, commit_messages)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.7,
            )

            if result.get("success"):
                # Generate suggested title if not provided
                suggested_title = pr_title or "feat: 新功能实现"
                result["generated_description"] = result["text"]
                result["suggested_title"] = suggested_title
                del result["text"]  # Remove original key to match expected format

            logger.info("GitHub PR description generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub PR description generation failed: {str(e)}")
            return {
                "generated_description": "",
                "suggested_title": pr_title or "PR Title",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "error": str(e),
            }

    async def generate_commit_message(
        self,
        code_changes: str,
        change_type: str = "feat",
        scope: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate conventional commit message."""
        try:
            prompt_config = github_prompts.COMMIT_MESSAGE
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(code_changes, change_type, scope)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=800,
                temperature=0.3,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub commit message generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub commit message generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def review_code_changes(
        self,
        code_diff: str,
        review_focus: Optional[str] = None,
        programming_language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate code review comments."""
        try:
            prompt_config = github_prompts.CODE_REVIEW
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(code_diff, review_focus, programming_language)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.4,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub code review completed successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub code review failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_release_notes(
        self,
        version: str,
        commit_messages: List[str],
        breaking_changes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate release notes from commit messages."""
        try:
            prompt_config = github_prompts.RELEASE_NOTES
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(version, commit_messages, breaking_changes)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.5,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub release notes generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub release notes generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_task_description(
        self,
        task_description: str,
    ) -> Dict[str, Any]:
        """Generate task description based on GitHub task description format."""
        try:
            prompt_config = github_prompts.TASK_DESCRIPTION
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description)

            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1000,
                temperature=0.5,
            )

            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]

            logger.info("GitHub task description generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub task description generation failed: {str(e)}")
            return {
                "text": "",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_pr_description_from_jira(
        self,
        jira_ticket_id: str,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
        description_template: str = "",
        files_changed: Optional[List["ParsedFile"]] = None,
        commits: Optional[List["ParsedCommit"]] = None,
    ) -> Dict[str, Any]:
        """Generate GitHub PR description from Jira ticket and code changes."""
        try:
            logger.info(f"Starting PR description generation for Jira ticket: {jira_ticket_id}")
            logger.info(f"Input parameters - PR Title: '{pr_title}', Branch: '{branch_name}'")
            logger.info(f"Code changes length: {len(code_changes)} characters")
            logger.info(f"Commit messages count: {len(commit_messages) if commit_messages else 0}")
            logger.info(f"Description template length: {len(description_template)} characters")
            logger.info(f"Files changed count: {len(files_changed) if files_changed else 0}")
            logger.info(f"Commits count: {len(commits) if commits else 0}")

            # Check if jira_ticket_id is empty or a test ticket
            if not jira_ticket_id or jira_ticket_id.strip() == "":
                # Use default data when no Jira ticket is provided
                jira_details = {
                    "summary": "Pull Request",
                    "description": "No Jira ticket provided. This PR contains code changes that improve the codebase."
                }
                logger.info(f"✅ No Jira ticket provided, using default data")
            elif jira_ticket_id.startswith("TEST-"):
                # Use mock data for testing
                jira_details = {
                    "summary": "Test ticket for streaming functionality",
                    "description": "This is a test ticket to verify streaming output works correctly. It should generate a proper PR description with multiple sections and formatting."
                }
                logger.info(f"✅ Using test data for ticket {jira_ticket_id}")
                logger.info(f"Test Jira summary: '{jira_details['summary']}'")
            else:
                # 1. Get Jira ticket details
                logger.info(f"🔍 Fetching Jira ticket details for: {jira_ticket_id}")
                async with jira_api_client as client:
                    jira_details_result = await client.get_issue_details(
                        issue_key=jira_ticket_id,
                        include_comments=False,
                        include_attachments=False,
                    )

                if not jira_details_result.get("success"):
                    error_msg = jira_details_result.get(
                        "error", f"Jira ticket {jira_ticket_id} not found or access denied."
                    )
                    logger.error(f"❌ Failed to retrieve Jira details: {error_msg}")
                    logger.error(f"Jira API response: {jira_details_result}")
                    return {
                        "success": False,
                        "error": error_msg,
                        "generated_description": "",
                        "suggested_title": pr_title,
                        "model": settings.azure_openai_deployment_name,
                        "tokens_used": 0,
                    }

                jira_details = jira_details_result.get("data", {})
                logger.info(f"✅ Successfully retrieved Jira ticket details")
                logger.info(f"Jira summary: '{jira_details.get('summary', 'N/A')}'")
                logger.info(f"Jira description length: {len(jira_details.get('description', ''))} characters")

            # 2. Combine Jira details with other info for the prompt
            jira_summary = jira_details.get("summary", "No summary found.")
            jira_description = jira_details.get("description", "No description found.")

            logger.info(f"📝 Processing data for prompt generation:")
            logger.info(f"  - Jira summary: '{jira_summary}'")
            logger.info(f"  - Jira description available: {jira_description != 'No description found.'}")
            logger.info(f"  - Code changes available: {bool(code_changes and code_changes.strip())}")
            logger.info(f"  - Template provided: {bool(description_template and description_template.strip())}")

            commit_messages_str = "\\n".join(
                f"- {msg}" for msg in commit_messages
            ) if commit_messages else "No commit messages provided."

            logger.info(f"  - Commit messages processed: {len(commit_messages) if commit_messages else 0} messages")

            # Format enhanced data structures
            files_changed_str = self._format_files_changed(files_changed)
            commits_str = self._format_commits(commits)

            logger.info(f"  - Files changed formatted: {len(files_changed_str)} characters")
            logger.info(f"  - Commits formatted: {len(commits_str)} characters")

            # Manage context length to avoid token limits
            final_code_changes, final_commit_messages, final_files_changed, final_commits = self._manage_context_length(
                jira_summary=jira_summary,
                jira_description=jira_description,
                code_changes=code_changes,
                commit_messages_str=commit_messages_str,
                files_changed_str=files_changed_str,
                commits_str=commits_str,
                description_template=description_template
            )

            # Choose the appropriate prompt based on whether a template is provided
            has_template = description_template and description_template.strip()
            if has_template:
                logger.info("🤖 Generating AI prompt using PR_DESCRIPTION_WITH_TEMPLATE (template provided)")
                prompt_config = github_prompts.PR_DESCRIPTION_WITH_TEMPLATE
                prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
                prompt = prompt_func(
                    pr_title=pr_title,
                    jira_ticket_id=jira_ticket_id,
                    jira_summary=jira_summary,
                    jira_description=jira_description,
                    branch_name=branch_name,
                    code_changes=final_code_changes,
                    commit_messages=final_commit_messages,
                    description_template=description_template,
                    files_changed=final_files_changed,
                    commits=final_commits,
                )
            else:
                logger.info("🤖 Generating AI prompt using PR_DESCRIPTION_WITHOUT_TEMPLATE (no template)")
                prompt_config = github_prompts.PR_DESCRIPTION_WITHOUT_TEMPLATE
                prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
                prompt = prompt_func(
                    pr_title=pr_title,
                    jira_ticket_id=jira_ticket_id,
                    jira_summary=jira_summary,
                    jira_description=jira_description,
                    branch_name=branch_name,
                    code_changes=final_code_changes,
                    commit_messages=final_commit_messages,
                    files_changed=final_files_changed,
                    commits=final_commits,
                )

            logger.info(f"Generated prompt length: {len(prompt)} characters")

            logger.info("🚀 Calling AI service for text generation")
            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.7,
            )

            if result.get("success"):
                logger.info("✅ AI generation successful")
                logger.info(f"Generated description length: {len(result.get('text', ''))} characters")
                logger.info(f"Tokens used: {result.get('tokens_used', 0)}")
                logger.info(f"Model used: {result.get('model', 'unknown')}")

                result["generated_description"] = result["text"]
                result["suggested_title"] = pr_title or jira_summary or "feat: New feature"
                del result["text"]
            else:
                logger.error("❌ AI generation failed")
                logger.error(f"Error details: {result.get('error', 'Unknown error')}")

            logger.info("GitHub PR description from Jira generation completed")
            return result

        except Exception as e:
            logger.error(f"GitHub PR description generation from Jira failed: {str(e)}")
            return {
                "generated_description": "",
                "suggested_title": pr_title or "PR Title",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_pr_description_from_jira_stream(
        self,
        jira_ticket_id: str,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
        description_template: str = "",
        files_changed: Optional[List["ParsedFile"]] = None,
        commits: Optional[List["ParsedCommit"]] = None,
    ) -> AsyncIterator[str]:
        """Generate streaming GitHub PR description from Jira ticket and code changes."""
        try:
            logger.info(f"Starting streaming PR description generation for Jira ticket: {jira_ticket_id}")
            logger.info(f"Input parameters - PR Title: '{pr_title}', Branch: '{branch_name}'")
            logger.info(f"Code changes length: {len(code_changes)} characters")
            logger.info(f"Commit messages count: {len(commit_messages) if commit_messages else 0}")
            logger.info(f"Description template length: {len(description_template)} characters")
            logger.info(f"Files changed count: {len(files_changed) if files_changed else 0}")
            logger.info(f"Commits count: {len(commits) if commits else 0}")

            # Check if jira_ticket_id is empty or a test ticket
            if not jira_ticket_id or jira_ticket_id.strip() == "":
                # Use default data when no Jira ticket is provided
                jira_details = {
                    "summary": "Pull Request",
                    "description": "No Jira ticket provided. This PR contains code changes that improve the codebase."
                }
                logger.info(f"✅ No Jira ticket provided, using default data")
            elif jira_ticket_id.startswith("TEST-"):
                # Use mock data for testing
                jira_details = {
                    "summary": "Test ticket for streaming functionality",
                    "description": "This is a test ticket to verify streaming output works correctly. It should generate a proper PR description with multiple sections and formatting."
                }
                logger.info(f"✅ Using test data for ticket {jira_ticket_id}")
                logger.info(f"Test Jira summary: '{jira_details['summary']}'")
            else:
                # 1. Get Jira ticket details
                logger.info(f"🔍 Fetching Jira ticket details for: {jira_ticket_id}")
                async with jira_api_client as client:
                    jira_details_result = await client.get_issue_details(
                        issue_key=jira_ticket_id,
                        include_comments=False,
                        include_attachments=False,
                    )

                if not jira_details_result.get("success"):
                    error_msg = jira_details_result.get(
                        "error", f"Jira ticket {jira_ticket_id} not found or access denied."
                    )
                    logger.error(f"❌ Failed to retrieve Jira details: {error_msg}")
                    logger.error(f"Jira API response: {jira_details_result}")
                    yield f"Error: {error_msg}"
                    return

                jira_details = jira_details_result.get("data", {})
                logger.info(f"✅ Successfully retrieved Jira ticket details")
                logger.info(f"Jira summary: '{jira_details.get('summary', 'N/A')}'")
                logger.info(f"Jira description length: {len(jira_details.get('description', ''))} characters")

            # 2. Combine Jira details with other info for the prompt
            jira_summary = jira_details.get("summary", "No summary found.")
            jira_description = jira_details.get("description", "No description found.")

            logger.info(f"📝 Processing data for streaming prompt generation:")
            logger.info(f"  - Jira summary: '{jira_summary}'")
            logger.info(f"  - Jira description available: {jira_description != 'No description found.'}")
            logger.info(f"  - Code changes available: {bool(code_changes and code_changes.strip())}")
            logger.info(f"  - Template provided: {bool(description_template and description_template.strip())}")

            commit_messages_str = "\\n".join(
                f"- {msg}" for msg in commit_messages
            ) if commit_messages else "No commit messages provided."

            logger.info(f"  - Commit messages processed: {len(commit_messages) if commit_messages else 0} messages")

            # Format enhanced data structures
            files_changed_str = self._format_files_changed(files_changed)
            commits_str = self._format_commits(commits)

            logger.info(f"  - Files changed formatted: {len(files_changed_str)} characters")
            logger.info(f"  - Commits formatted: {len(commits_str)} characters")

            # Manage context length to avoid token limits
            final_code_changes, final_commit_messages, final_files_changed, final_commits = self._manage_context_length(
                jira_summary=jira_summary,
                jira_description=jira_description,
                code_changes=code_changes,
                commit_messages_str=commit_messages_str,
                files_changed_str=files_changed_str,
                commits_str=commits_str,
                description_template=description_template
            )

            # Choose the appropriate prompt based on whether a template is provided
            has_template = description_template and description_template.strip()
            if has_template:
                logger.info("🤖 Generating AI prompt using PR_DESCRIPTION_WITH_TEMPLATE (template provided)")
                prompt_config = github_prompts.PR_DESCRIPTION_WITH_TEMPLATE
                prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
                prompt = prompt_func(
                    pr_title=pr_title,
                    jira_ticket_id=jira_ticket_id,
                    jira_summary=jira_summary,
                    jira_description=jira_description,
                    branch_name=branch_name,
                    code_changes=final_code_changes,
                    commit_messages=final_commit_messages,
                    description_template=description_template,
                    files_changed=final_files_changed,
                    commits=final_commits,
                )
            else:
                logger.info("🤖 Generating AI prompt using PR_DESCRIPTION_WITHOUT_TEMPLATE (no template)")
                prompt_config = github_prompts.PR_DESCRIPTION_WITHOUT_TEMPLATE
                prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
                prompt = prompt_func(
                    pr_title=pr_title,
                    jira_ticket_id=jira_ticket_id,
                    jira_summary=jira_summary,
                    jira_description=jira_description,
                    branch_name=branch_name,
                    code_changes=final_code_changes,
                    commit_messages=final_commit_messages,
                    files_changed=final_files_changed,
                    commits=final_commits,
                )

            logger.info(f"Generated prompt length: {len(prompt)} characters")

            # Generate streaming response
            logger.info("🚀 Starting streaming AI text generation")
            chunk_count = 0
            async for chunk in self.generate_text_stream(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=2000,
                temperature=0.7,
            ):
                chunk_count += 1
                yield chunk

            logger.info(f"✅ GitHub PR description from Jira generated successfully (streaming)")
            logger.info(f"Total chunks streamed: {chunk_count}")

        except Exception as e:
            logger.error(f"GitHub PR description streaming generation from Jira failed: {str(e)}")
            yield f"Error: {str(e)}"


# Global GitHub service instance
github_service = GitHubService()