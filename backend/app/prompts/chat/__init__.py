"""Chat prompts module."""

from app.prompts.chat.general import GENERAL_CHAT_PROMPT

class ChatPrompts:
    """Chat prompts collection."""
    
    GENERAL = GENERAL_CHAT_PROMPT

# Global instance
chat_prompts = ChatPrompts() 