"""General chat prompt templates."""

GENERAL_CHAT_SYSTEM_MESSAGE = """你是一个智能助手，请友好、准确地回答用户的问题。使用中文回复。"""

def generate_general_chat_prompt(message: str) -> str:
    """生成通用聊天的 prompt。"""
    return message

GENERAL_CHAT_PROMPT = {
    "system_message": GENERAL_CHAT_SYSTEM_MESSAGE,
    "generate_prompt": generate_general_chat_prompt,
} 