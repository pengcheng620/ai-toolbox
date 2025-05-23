"""Jira acceptance criteria prompt templates."""

from typing import Dict, Any, Optional

ACCEPTANCE_CRITERIA_SYSTEM_MESSAGE = """你是一个专业的产品经理和测试专家，专门编写清晰、可测试的验收条件。"""

def generate_acceptance_criteria_prompt(
    task_description: str,
    user_story: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """生成验收条件的 prompt。"""
    import json
    
    return f"""
基于以下信息，生成详细的验收条件：

任务描述：{task_description}
用户故事：{user_story or "未提供"}
上下文：{json.dumps(context or {}, ensure_ascii=False, indent=2)}

请按照以下格式生成验收条件：
- 给定 (Given): 前置条件
- 当 (When): 操作步骤
- 那么 (Then): 预期结果

请用中文回复，每个条件要具体、可测试。
"""

ACCEPTANCE_CRITERIA_PROMPT = {
    "system_message": ACCEPTANCE_CRITERIA_SYSTEM_MESSAGE,
    "generate_prompt": generate_acceptance_criteria_prompt,
    "suggestions": [
        "确保验收条件可测试",
        "检查边界条件", 
        "考虑异常情况",
    ]
} 