"""Prompts for GitHub pull request description generation."""

from typing import List, Optional

PR_DESCRIPTION_SYSTEM_MESSAGE = """你是一个专业的代码审查和项目管理助手。请根据Pull Request信息生成详细的PR描述。

PR描述应该包含：
1. 📝 变更概述
2. 🔧 技术实现
3. ✅ 测试覆盖
4. 📋 检查清单
5. 🚨 注意事项

请用markdown格式，中英文混合，内容专业准确。"""

def generate_pr_description_prompt(
    pr_title: str,
    code_changes: str,
    branch_name: str = "",
    commit_messages: Optional[List[str]] = None
) -> str:
    """生成 PR 描述的 prompt。"""
    
    return f"""
PR标题：{pr_title}
分支名称：{branch_name}
代码变更：
{code_changes}

提交消息：
{chr(10).join(commit_messages or [])}

请生成详细的PR描述：
"""

PR_DESCRIPTION_PROMPT = {
    "system_message": "You are an expert software developer and technical writer. Your task is to generate a clear, concise, and professional GitHub pull request description based on the provided information.",
    "generate_prompt": lambda pr_title, code_changes, branch_name, commit_messages: f"""
        **PR Title:** {pr_title}
        **Branch Name:** {branch_name}
        **Commit Messages:**
        - {"- ".join(commit_messages) if commit_messages else "N/A"}
        **Code Changes Summary:**
        ```
        {code_changes}
        ```
        **Instructions:**
        Based on the information above, please generate a pull request description. The description should include:
        1. A brief summary of the changes.
        2. The problem this PR solves.
        3. How the changes were tested.
        4. Any relevant screenshots or follow-up tasks.
    """,
    "suggestions": [
        "Add a 'Testing' section.",
        "Include a link to the Jira ticket.",
        "Add screenshots for UI changes.",
    ],
}

PR_DESCRIPTION_FROM_JIRA_PROMPT = {
    "system_message": """
        You are a senior software engineer preparing a pull request. Your task is to complete a PR description template using the provided context.
        Analyze the Jira ticket details, commit messages, and code diff to understand the purpose and implementation of the changes.
        Fill in each section of the template accurately and concisely. Maintain the original structure and formatting of the template.
    """,
    "generate_prompt": lambda pr_title, jira_ticket_id, jira_summary, jira_description, branch_name, code_changes, commit_messages, description_template: f"""
        **Context for PR Description Generation**

        ---
        **1. Jira Ticket Information:**
        - **ID:** {jira_ticket_id}
        - **Title:** {jira_summary}
        - **Description:**
        {jira_description}

        ---
        **2. Git Information:**
        - **PR Title:** {pr_title}
        - **Branch:** {branch_name}
        - **Commit Messages:**
        {commit_messages}

        ---
        **3. Code Changes (Diff):**
        ```diff
        {code_changes}
        ```

        ---
        **4. PR Description Template to Fill:**
        ```markdown
        {description_template}
        ```

        **Your Task:**
        Complete the 'PR Description Template' based on all the context provided above.
        -  Ensure the final output is only the completed markdown, ready to be copied and pasted.
        -  Replace placeholders like '[FILL]' or add content to the appropriate sections.
        -  Do not alter the structure of the template.
    """,
    "suggestions": [
        "Ensure all sections of the template are filled.",
        "Verify the Jira ticket link is correct.",
        "Add a note about any follow-up work needed.",
    ],
} 