"""Jira task comment prompt templates."""

from typing import Dict, Any, Optional

TASK_COMMENT_SYSTEM_MESSAGE = """你是一个专业的软件开发项目管理助手。请根据Jira任务描述生成详细的工作评论。

评论应该包含：
1. 任务理解和分析
2. 技术实现方案
3. 可能的风险点
4. 预估工作量
5. 测试验证计划

请用中文回复，格式清晰，内容专业。"""

def generate_task_comment_prompt(
    task_description: str,
    task_type: str = "development", 
    context: Optional[Dict[str, Any]] = None
) -> str:
    """生成任务评论的 prompt。"""
    import json
    
    return f"""
任务类型：{task_type}
任务描述：{task_description}
上下文信息：{json.dumps(context or {}, ensure_ascii=False, indent=2)}

请生成详细的工作评论：
"""

TASK_COMMENT_PROMPT = {
    "system_message": TASK_COMMENT_SYSTEM_MESSAGE,
    "generate_prompt": generate_task_comment_prompt,
    "suggestions": ["检查任务依赖关系", "评估技术风险", "制定测试计划"]
} 