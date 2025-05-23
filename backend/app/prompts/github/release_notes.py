"""GitHub release notes prompt templates."""

from typing import List, Optional

RELEASE_NOTES_SYSTEM_MESSAGE = """你是一个专业的产品发布管理专家，擅长编写清晰、结构化的发布说明。"""

def generate_release_notes_prompt(
    version: str,
    commit_messages: List[str],
    breaking_changes: Optional[List[str]] = None
) -> str:
    """生成发布说明的 prompt。"""
    breaking_text = "\n".join(breaking_changes or [])
    commits_text = "\n".join(commit_messages)
    
    return f"""
基于以下信息生成版本发布说明：

版本号：{version}

提交消息：
{commits_text}

破坏性变更：
{breaking_text or "无"}

请生成结构化的发布说明，包含：
1. 🆕 新功能
2. 🐛 Bug修复
3. 🔧 改进优化
4. ⚠️  破坏性变更
5. 📖 文档更新

请用markdown格式，中文描述。
"""

RELEASE_NOTES_PROMPT = {
    "system_message": RELEASE_NOTES_SYSTEM_MESSAGE,
    "generate_prompt": generate_release_notes_prompt,
    "suggestions": [
        "添加迁移指南",
        "包含致谢信息",
        "提供下载链接",
    ]
} 