"""Prompt utilities for easier access and usage."""

from typing import Dict, Any, Callable, Union, Optional
from app.prompts.jira import jira_prompts
from app.prompts.github import github_prompts
from app.prompts.chat import chat_prompts


class PromptManager:
    """统一的 Prompt 管理器，提供便捷的访问方法。"""
    
    def __init__(self):
        self.jira = jira_prompts
        self.github = github_prompts
        self.chat = chat_prompts
    
    def get_prompt_config(self, service: str, prompt_type: str) -> Dict[str, Any]:
        """获取指定服务和类型的 prompt 配置。
        
        Args:
            service: 服务名称 ('jira', 'github', 'chat')
            prompt_type: prompt 类型 (如 'TASK_COMMENT', 'PR_DESCRIPTION' 等)
            
        Returns:
            prompt 配置字典
        """
        service_map = {
            'jira': self.jira,
            'github': self.github,
            'chat': self.chat
        }
        
        if service not in service_map:
            raise ValueError(f"Unknown service: {service}")
        
        service_obj = service_map[service]
        
        if not hasattr(service_obj, prompt_type):
            raise ValueError(f"Unknown prompt type '{prompt_type}' for service '{service}'")
        
        return getattr(service_obj, prompt_type)
    
    def generate_prompt(
        self, 
        service: str, 
        prompt_type: str, 
        *args, 
        **kwargs
    ) -> str:
        """生成指定服务和类型的 prompt。
        
        Args:
            service: 服务名称
            prompt_type: prompt 类型
            *args: prompt 生成函数的位置参数
            **kwargs: prompt 生成函数的关键字参数
            
        Returns:
            生成的 prompt 字符串
        """
        config = self.get_prompt_config(service, prompt_type)
        prompt_func: Callable = config["generate_prompt"]
        return prompt_func(*args, **kwargs)
    
    def get_system_message(self, service: str, prompt_type: str) -> str:
        """获取指定服务和类型的系统消息。
        
        Args:
            service: 服务名称
            prompt_type: prompt 类型
            
        Returns:
            系统消息字符串
        """
        config = self.get_prompt_config(service, prompt_type)
        return str(config["system_message"])
    
    def get_suggestions(self, service: str, prompt_type: str) -> Optional[list]:
        """获取指定服务和类型的建议列表。
        
        Args:
            service: 服务名称
            prompt_type: prompt 类型
            
        Returns:
            建议列表，如果没有则返回 None
        """
        config = self.get_prompt_config(service, prompt_type)
        return config.get("suggestions")


def create_prompt_response(
    prompt_text: str,
    system_message: str,
    suggestions: Optional[list] = None,
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> Dict[str, Any]:
    """创建标准的 prompt 请求参数。
    
    Args:
        prompt_text: prompt 文本
        system_message: 系统消息
        suggestions: 建议列表
        max_tokens: 最大 token 数
        temperature: 温度参数
        
    Returns:
        标准化的请求参数字典
    """
    return {
        "prompt": prompt_text,
        "system_message": system_message,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "suggestions": suggestions or []
    }


def validate_prompt_config(config: Dict[str, Any]) -> bool:
    """验证 prompt 配置的有效性。
    
    Args:
        config: prompt 配置字典
        
    Returns:
        是否有效
    """
    required_keys = ["system_message", "generate_prompt"]
    
    if not all(key in config for key in required_keys):
        return False
    
    if not callable(config["generate_prompt"]):
        return False
    
    if not isinstance(config["system_message"], str):
        return False
    
    return True


# 全局 prompt 管理器实例
prompt_manager = PromptManager() 