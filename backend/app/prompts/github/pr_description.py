"""GitHub PR description prompt templates."""

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
    "system_message": PR_DESCRIPTION_SYSTEM_MESSAGE,
    "generate_prompt": generate_pr_description_prompt,
} 