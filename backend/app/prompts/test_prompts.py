"""Test script for prompt management system."""

import asyncio
from app.prompts import prompt_manager, validate_prompt_config
from app.prompts.jira import jira_prompts
from app.prompts.github import github_prompts
from app.prompts.chat import chat_prompts


def test_prompt_configs():
    """测试所有 prompt 配置的有效性。"""
    print("🧪 Testing prompt configurations...")
    
    # Test Jira prompts
    jira_prompt_types = [
        "TASK_COMMENT",
        "ACCEPTANCE_CRITERIA", 
        "EFFORT_ESTIMATION",
        "SUMMARY_FOR_TESTERS"
    ]
    
    for prompt_type in jira_prompt_types:
        config = getattr(jira_prompts, prompt_type)
        is_valid = validate_prompt_config(config)
        status = "✅" if is_valid else "❌"
        print(f"  {status} Jira.{prompt_type}: {'Valid' if is_valid else 'Invalid'}")
    
    # Test GitHub prompts
    github_prompt_types = [
        "PR_DESCRIPTION",
        "COMMIT_MESSAGE",
        "CODE_REVIEW", 
        "RELEASE_NOTES",
        "TASK_DESCRIPTION"
    ]
    
    for prompt_type in github_prompt_types:
        config = getattr(github_prompts, prompt_type)
        is_valid = validate_prompt_config(config)
        status = "✅" if is_valid else "❌"
        print(f"  {status} GitHub.{prompt_type}: {'Valid' if is_valid else 'Invalid'}")
    
    # Test Chat prompts
    chat_prompt_types = ["GENERAL"]
    
    for prompt_type in chat_prompt_types:
        config = getattr(chat_prompts, prompt_type)
        is_valid = validate_prompt_config(config)
        status = "✅" if is_valid else "❌"
        print(f"  {status} Chat.{prompt_type}: {'Valid' if is_valid else 'Invalid'}")


def test_prompt_manager():
    """测试 PromptManager 的功能。"""
    print("\n🧪 Testing PromptManager...")
    
    try:
        # Test get_prompt_config
        config = prompt_manager.get_prompt_config('jira', 'TASK_COMMENT')
        print("  ✅ get_prompt_config: Success")
        
        # Test generate_prompt with proper string arguments
        prompt = prompt_manager.generate_prompt(
            'jira', 
            'TASK_COMMENT',
            "实现用户登录功能",  # task_description as string
            "development",      # task_type as string
            {"priority": "high"}  # context as dict
        )
        print("  ✅ generate_prompt: Success")
        print(f"     Generated prompt length: {len(prompt)} characters")
        
        # Test get_system_message
        system_msg = prompt_manager.get_system_message('jira', 'TASK_COMMENT')
        print("  ✅ get_system_message: Success")
        print(f"     System message length: {len(system_msg)} characters")
        
        # Test get_suggestions
        suggestions = prompt_manager.get_suggestions('jira', 'TASK_COMMENT')
        print("  ✅ get_suggestions: Success")
        print(f"     Suggestions count: {len(suggestions) if suggestions else 0}")
        
    except Exception as e:
        print(f"  ❌ PromptManager test failed: {str(e)}")


def test_prompt_generation():
    """测试各种 prompt 的生成。"""
    print("\n🧪 Testing prompt generation...")
    
    test_cases = [
        {
            "service": "jira",
            "type": "TASK_COMMENT",
            "args": ["实现用户注册功能", "development", {"priority": "high"}],
            "name": "Jira Task Comment"
        },
        {
            "service": "github", 
            "type": "PR_DESCRIPTION",
            "args": ["feat: 添加用户认证", "代码变更内容", "feature/auth", ["commit1", "commit2"]],
            "name": "GitHub PR Description"
        },
        {
            "service": "chat",
            "type": "GENERAL", 
            "args": ["你好，请介绍一下自己"],
            "name": "General Chat"
        }
    ]
    
    for case in test_cases:
        try:
            prompt = prompt_manager.generate_prompt(
                case["service"],
                case["type"], 
                *case["args"]
            )
            status = "✅" if len(prompt) > 0 else "❌"
            print(f"  {status} {case['name']}: Generated {len(prompt)} characters")
        except Exception as e:
            print(f"  ❌ {case['name']}: Failed - {str(e)}")


def main():
    """运行所有测试。"""
    print("🚀 Starting Prompt System Tests\n")
    
    test_prompt_configs()
    test_prompt_manager()
    test_prompt_generation()
    
    print("\n✨ Tests completed!")


if __name__ == "__main__":
    main() 