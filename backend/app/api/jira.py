"""Jira API endpoints."""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.azure_ai import azure_ai_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class JiraCommentRequest(BaseModel):
    """Request model for Jira comment generation."""

    task_description: str = Field(..., description="Jira task description")
    task_type: str = Field(default="development", description="Type of task")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )
    stream: bool = Field(default=False, description="Whether to stream the response")


class JiraAcceptanceCriteriaRequest(BaseModel):
    """Request model for Jira acceptance criteria generation."""

    task_description: str = Field(..., description="Task description")
    user_story: str = Field(default="", description="User story (optional)")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


class JiraEffortEstimationRequest(BaseModel):
    """Request model for Jira effort estimation."""

    task_description: str = Field(..., description="Task description")
    task_type: str = Field(default="development", description="Type of task")
    team_velocity: Optional[int] = Field(default=None, description="Team velocity")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )


# Response models
class JiraCommentResponse(BaseModel):
    """Response model for Jira comment generation."""

    generated_content: str
    suggestions: List[str]
    model: str
    tokens_used: int
    error: str = ""


class JiraAcceptanceCriteriaResponse(BaseModel):
    """Response model for Jira acceptance criteria generation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


class JiraEffortEstimationResponse(BaseModel):
    """Response model for Jira effort estimation."""

    text: str
    suggestions: List[str]
    model: str
    tokens_used: int
    success: bool
    error: str = ""


# Endpoints
@router.post("/comment", response_model=JiraCommentResponse)
async def generate_jira_comment(request: JiraCommentRequest):
    """Generate Jira task comment using specialized AI prompt."""
    try:
        logger.info(f"Generating Jira comment for task type: {request.task_type}")

        result = await azure_ai_service.generate_jira_comment(
            task_description=request.task_description,
            task_type=request.task_type,
            context=request.context,
        )

        return JiraCommentResponse(**result)

    except Exception as e:
        logger.error(f"Jira comment generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/acceptance-criteria", response_model=JiraAcceptanceCriteriaResponse)
async def generate_acceptance_criteria(request: JiraAcceptanceCriteriaRequest):
    """Generate acceptance criteria for Jira task."""
    try:
        logger.info(f"Generating acceptance criteria for task")

        # Temporarily use basic text generation
        result = await azure_ai_service.generate_text(
            prompt=f"为以下任务生成验收标准：{request.task_description}",
            system_message="你是一个专业的产品经理，请生成详细的验收标准。",
            max_tokens=1000,
        )

        # Convert to expected format
        result = {
            "text": result.get("text", ""),
            "suggestions": ["检查功能完整性", "验证用户体验", "确认性能指标"],
            "model": result.get("model", ""),
            "tokens_used": result.get("tokens_used", 0),
            "success": result.get("success", False),
            "error": result.get("error", "")
        }

        return JiraAcceptanceCriteriaResponse(**result)

    except Exception as e:
        logger.error(f"Jira acceptance criteria generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/estimate", response_model=JiraEffortEstimationResponse)
async def estimate_task_effort(request: JiraEffortEstimationRequest):
    """Estimate effort for Jira task."""
    try:
        logger.info(f"Estimating effort for task type: {request.task_type}")

        # Temporarily use basic text generation
        result = await azure_ai_service.generate_text(
            prompt=f"估算以下{request.task_type}任务的工作量：{request.task_description}",
            system_message="你是一个专业的项目经理，请估算任务工作量。",
            max_tokens=800,
        )

        # Convert to expected format
        result = {
            "text": result.get("text", ""),
            "suggestions": ["考虑技术复杂度", "评估团队经验", "预留缓冲时间"],
            "model": result.get("model", ""),
            "tokens_used": result.get("tokens_used", 0),
            "success": result.get("success", False),
            "error": result.get("error", "")
        }

        return JiraEffortEstimationResponse(**result)

    except Exception as e:
        logger.error(f"Jira effort estimation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoint for backward compatibility
@router.post("/generate")
async def generate_jira_legacy(request: JiraCommentRequest):
    """Legacy endpoint for Jira comment generation with streaming support."""
    if request.stream:
        # Return streaming response
        from fastapi.responses import StreamingResponse

        async def generate_stream():
            try:
                # Temporary mock implementation for demonstration
                import asyncio

                mock_response = f"""## 任务分析

**任务类型**: {request.task_type}
**任务描述**: {request.task_description}

## 技术实现方案

1. **前端实现**
   - 设计登录表单界面
   - 实现表单验证逻辑
   - 添加邮箱格式验证

2. **后端实现**
   - 创建用户认证API
   - 实现密码加密存储
   - 添加邮箱验证功能

## 可能的风险点

- 密码安全性考虑
- 邮箱验证的可靠性
- 用户体验优化

## 预估工作量

预计需要 {request.context.get('estimated_hours', 8)} 小时完成

## 测试验证计划

1. 单元测试覆盖
2. 集成测试验证
3. 用户体验测试
"""

                # Simulate streaming by sending chunks
                words = mock_response.split()
                for i, word in enumerate(words):
                    if i > 0 and i % 3 == 0:  # Send every 3 words
                        chunk = " ".join(words[i-3:i]) + " "
                        yield f"data: {chunk}\n\n"
                        await asyncio.sleep(0.1)  # Simulate typing delay

                # Send remaining words
                remaining = len(words) % 3
                if remaining > 0:
                    chunk = " ".join(words[-remaining:])
                    yield f"data: {chunk}\n\n"

                yield "data: [DONE]\n\n"

            except Exception as e:
                yield f"data: Error: {str(e)}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
    else:
        # For non-streaming, return complete response
        try:
            # Temporary mock implementation for demonstration
            mock_response = f"""## 任务分析

**任务类型**: {request.task_type}
**任务描述**: {request.task_description}

## 技术实现方案

1. **前端实现**
   - 设计登录表单界面
   - 实现表单验证逻辑
   - 添加邮箱格式验证

2. **后端实现**
   - 创建用户认证API
   - 实现密码加密存储
   - 添加邮箱验证功能

## 可能的风险点

- 密码安全性考虑
- 邮箱验证的可靠性
- 用户体验优化

## 预估工作量

预计需要 {request.context.get('estimated_hours', 8)} 小时完成

## 测试验证计划

1. 单元测试覆盖
2. 集成测试验证
3. 用户体验测试

## 建议

- 使用成熟的认证库
- 实施多因素认证
- 定期安全审计
"""

            result = {
                "generated_content": mock_response,
                "suggestions": ["检查任务依赖关系", "评估技术风险", "制定测试计划"],
                "model": "gpt-4o",
                "tokens_used": len(mock_response.split()),
            }

            return JiraCommentResponse(**result)

        except Exception as e:
            logger.error(f"Jira comment generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))