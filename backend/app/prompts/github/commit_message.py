"""GitHub commit message prompt templates."""

from typing import Optional

COMMIT_MESSAGE_SYSTEM_MESSAGE = """你是一个专业的Git提交规范专家，擅长编写清晰、规范的提交消息。"""

def generate_commit_message_prompt(
    code_changes: str,
    change_type: str = "feat",
    scope: Optional[str] = None
) -> str:
    """生成提交消息的 prompt。"""
    scope_text = f"({scope})" if scope else ""
    
    return f"""
基于以下代码变更，生成符合 Conventional Commits 规范的提交消息：

变更类型：{change_type}
作用域：{scope or "无"}
代码变更：
{code_changes}

格式要求：
- 标题：{change_type}{scope_text}: <描述>
- 正文：详细说明变更内容 (可选)
- 脚注：BREAKING CHANGE 或 关闭的 issue (可选)

请用中文描述，格式规范。
"""

COMMIT_MESSAGE_PROMPT = {
    "system_message": COMMIT_MESSAGE_SYSTEM_MESSAGE,
    "generate_prompt": generate_commit_message_prompt,
    "suggestions": [
        "确保提交消息简洁明了",
        "包含变更的原因",
        "遵循团队约定",
    ]
} 