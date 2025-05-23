# Prompts 管理模块

这个模块用于统一管理所有AI服务的提示词（prompts），提供更好的组织结构和可维护性。

## 目录结构

```
prompts/
├── __init__.py          # 模块初始化，导出所有 prompt 集合
├── README.md           # 本文档
├── utils.py            # 工具函数和管理器
├── test_prompts.py     # 测试文件
├── jira/               # Jira 相关 prompts
│   ├── __init__.py
│   ├── task_comment.py         # 任务评论生成
│   ├── acceptance_criteria.py  # 验收条件生成
│   ├── effort_estimation.py    # 工作量估算
│   └── summary_for_testers.py  # 测试人员总结
├── github/             # GitHub 相关 prompts
│   ├── __init__.py
│   ├── pr_description.py       # PR 描述生成
│   ├── commit_message.py       # 提交消息生成
│   ├── code_review.py          # 代码审查
│   ├── release_notes.py        # 发布说明
│   └── task_description.py     # 任务描述生成
└── chat/               # 聊天相关 prompts
    ├── __init__.py
    └── general.py              # 通用聊天
```

## Prompt 结构

每个 prompt 文件都遵循统一的结构：

```python
# 系统消息常量
SYSTEM_MESSAGE = """系统角色和指令"""

# prompt 生成函数
def generate_prompt(param1: str, param2: Optional[str] = None) -> str:
    """生成具体的 prompt 内容"""
    return f"基于参数生成的 prompt: {param1}, {param2}"

# Prompt 配置字典
PROMPT_CONFIG = {
    "system_message": SYSTEM_MESSAGE,
    "generate_prompt": generate_prompt,
    "suggestions": ["建议1", "建议2", "建议3"]  # 可选
}
```

## 使用方式

### 方式一：直接使用 Prompt 对象

```python
from app.prompts.jira import jira_prompts

# 使用 prompt
prompt_config = jira_prompts.TASK_COMMENT
prompt_func = prompt_config["generate_prompt"]
prompt = prompt_func(task_description, task_type, context)

result = await self.generate_text(
    prompt=prompt,
    system_message=str(prompt_config["system_message"]),
    max_tokens=1500,
    temperature=0.7,
)
```

### 方式二：使用 PromptManager（推荐）

```python
from app.prompts import prompt_manager

# 生成 prompt
prompt = prompt_manager.generate_prompt(
    'jira', 
    'TASK_COMMENT',
    task_description="实现用户登录功能",
    task_type="development",
    context={"priority": "high"}
)

# 获取系统消息
system_message = prompt_manager.get_system_message('jira', 'TASK_COMMENT')

# 获取建议
suggestions = prompt_manager.get_suggestions('jira', 'TASK_COMMENT')

# 使用工具函数创建请求参数
from app.prompts import create_prompt_response

request_params = create_prompt_response(
    prompt_text=prompt,
    system_message=system_message,
    suggestions=suggestions,
    max_tokens=1500,
    temperature=0.7
)
```

### 方式三：在服务中的实际使用

```python
from typing import Callable
from app.prompts.jira import jira_prompts

class JiraService(BaseAzureAIService):
    async def generate_task_comment(self, task_description: str, **kwargs):
        try:
            prompt_config = jira_prompts.TASK_COMMENT
            prompt_func: Callable = prompt_config["generate_prompt"]  # type: ignore
            prompt = prompt_func(task_description, **kwargs)
            
            result = await self.generate_text(
                prompt=prompt,
                system_message=str(prompt_config["system_message"]),
                max_tokens=1500,
                temperature=0.7,
            )
            
            if result.get("success"):
                result["suggestions"] = prompt_config["suggestions"]
            
            return result
        except Exception as e:
            # 错误处理
            pass
```

## 工具函数

### PromptManager

统一的 prompt 管理器，提供以下方法：

- `get_prompt_config(service, prompt_type)`: 获取 prompt 配置
- `generate_prompt(service, prompt_type, *args, **kwargs)`: 生成 prompt
- `get_system_message(service, prompt_type)`: 获取系统消息
- `get_suggestions(service, prompt_type)`: 获取建议列表

### 工具函数

- `create_prompt_response()`: 创建标准的请求参数
- `validate_prompt_config()`: 验证 prompt 配置有效性

## 测试

运行测试脚本验证 prompt 系统：

```bash
cd backend
python -m app.prompts.test_prompts
```

测试包括：
- 所有 prompt 配置的有效性验证
- PromptManager 功能测试
- 各种 prompt 生成测试

## 添加新的 Prompt

1. **创建 prompt 文件**：在相应目录下创建新的 `.py` 文件
2. **定义 prompt 结构**：按照标准结构定义系统消息、生成函数和配置
3. **更新初始化文件**：在 `__init__.py` 中导入并添加到对应的 prompts 类
4. **测试验证**：运行测试确保新 prompt 工作正常

### 示例：添加新的 Jira prompt

```python
# app/prompts/jira/new_feature.py
"""Jira new feature prompt templates."""

NEW_FEATURE_SYSTEM_MESSAGE = """你是一个产品经理助手..."""

def generate_new_feature_prompt(feature_name: str, requirements: str) -> str:
    return f"功能名称：{feature_name}\n需求：{requirements}"

NEW_FEATURE_PROMPT = {
    "system_message": NEW_FEATURE_SYSTEM_MESSAGE,
    "generate_prompt": generate_new_feature_prompt,
    "suggestions": ["评估可行性", "制定计划"]
}
```

然后在 `app/prompts/jira/__init__.py` 中添加：

```python
from app.prompts.jira.new_feature import NEW_FEATURE_PROMPT

class JiraPrompts:
    # ... 现有的 prompts
    NEW_FEATURE = NEW_FEATURE_PROMPT
```

## 特点

- **模块化**: 按功能分类组织 prompts
- **可重用**: prompt 函数可以在多个地方调用
- **类型安全**: 使用 TypeScript 风格的类型注解
- **易维护**: 集中管理所有 prompts，便于修改和优化
- **一致性**: 统一的接口和返回格式
- **工具支持**: 提供便捷的管理器和工具函数
- **测试完备**: 包含完整的测试套件

## 迁移说明

原有服务中的内联 prompt 定义已经迁移到此模块：

- `jira_service.py` 中的 prompt 已迁移到 `prompts/jira/` 
- `github_service.py` 中的 prompt 已迁移到 `prompts/github/`
- 前端 `src/components/jira/jira-servers.ts` 的 prompt 已迁移到 `prompts/jira/summary_for_testers.py`
- 前端 `src/components/github/github-servers.ts` 的 prompt 已迁移到 `prompts/github/task_description.py`

## 最佳实践

1. **命名规范**: 使用清晰的文件名和函数名
2. **文档化**: 为每个 prompt 函数添加说明文档
3. **参数化**: 使用参数而不是硬编码值
4. **模板化**: 使用 f-string 或模板字符串构建 prompt
5. **测试**: 为复杂的 prompt 逻辑编写测试用例
6. **版本控制**: prompt 的重要变更要记录和版本控制
7. **性能考虑**: 避免在 prompt 中包含过多不必要的内容
8. **安全性**: 注意用户输入的安全过滤和验证

## 性能和安全

- **缓存**: prompt 配置在模块加载时初始化，避免重复计算
- **内存优化**: 使用懒加载和合理的数据结构
- **输入验证**: 在 prompt 生成函数中验证输入参数
- **错误处理**: 提供完善的错误处理和降级方案 