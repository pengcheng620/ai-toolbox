"""GitHub code review prompt templates."""

from typing import Optional

CODE_REVIEW_SYSTEM_MESSAGE = """你是一个资深的代码审查专家，具有丰富的软件开发经验，擅长发现代码中的问题并提供建设性建议。"""

def generate_code_review_prompt(
    code_diff: str,
    review_focus: Optional[str] = None,
    programming_language: Optional[str] = None
) -> str:
    """生成代码审查的 prompt。"""
    focus_text = f"重点关注：{review_focus}" if review_focus else ""
    lang_text = f"编程语言：{programming_language}" if programming_language else ""
    
    return f"""
请对以下代码变更进行专业的代码审查：

{lang_text}
{focus_text}

代码差异：
{code_diff}

请提供：
1. 🔍 代码质量分析
2. 🐛 潜在问题识别
3. 🚀 性能优化建议
4. 📝 文档和注释建议
5. ✅ 最佳实践建议

请用中文回复，提供具体的改进建议。
"""

CODE_REVIEW_PROMPT = {
    "system_message": CODE_REVIEW_SYSTEM_MESSAGE,
    "generate_prompt": generate_code_review_prompt,
    "suggestions": [
        "运行静态代码分析",
        "确保测试覆盖",
        "检查安全漏洞",
    ]
} 