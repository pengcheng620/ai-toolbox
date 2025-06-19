"""Azure AI service with LangChain and OAuth support."""

import logging
from typing import Dict, Any, List, Optional, AsyncIterator, Union, TypedDict
import json

from openai import AsyncAzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import SecretStr

from app.config import settings
from app.services.azure_oauth import oauth_service
from app.utils.logger import get_logger
from app.utils.stream_handler import convert_to_stream

logger = get_logger(__name__)


class MessageDict(TypedDict):
    """Type definition for OpenAI message format."""
    role: str
    content: str


class AzureAIService:
    """Azure AI service with LangChain integration and OAuth support."""

    def __init__(self):
        """Initialize Azure AI service."""
        self._azure_client: Optional[AsyncAzureOpenAI] = None
        self._langchain_client: Optional[AzureChatOpenAI] = None
        logger.info("Azure AI service initialized")

    async def _get_azure_client(self) -> AsyncAzureOpenAI:
        """Get Azure OpenAI client with OAuth Bearer token authentication."""
        # Check if we need to refresh the client due to token expiring
        if self._azure_client is not None and oauth_service.is_token_expiring():
            logger.info("Token is expiring, refreshing Azure OpenAI client")
            self._azure_client = None

        if self._azure_client is None:
            if settings.use_oauth_auth:
                # Use OAuth token authentication
                token = await oauth_service.get_token()
                self._azure_client = AsyncAzureOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    azure_ad_token=token,
                    api_version=settings.azure_openai_api_version,
                )
                logger.info("Azure OpenAI client initialized with OAuth token")
            else:
                # Fallback to API key authentication
                self._azure_client = AsyncAzureOpenAI(
                    azure_endpoint=settings.azure_openai_endpoint,
                    api_key=settings.azure_openai_api_key,
                    api_version=settings.azure_openai_api_version,
                )
                logger.info("Azure OpenAI client initialized with API key")

        return self._azure_client

    async def _get_langchain_client(self) -> AzureChatOpenAI:
        """Get LangChain Azure client with OAuth Bearer token authentication."""
        # Check if we need to refresh the client due to token expiring
        if self._langchain_client is not None and oauth_service.is_token_expiring():
            logger.info("Token is expiring, refreshing LangChain client")
            self._langchain_client = None

        if self._langchain_client is None:
            # Check if the model is o3-mini which doesn't support temperature
            deployment_name = settings.azure_openai_deployment_name

            if settings.use_oauth_auth:
                # Use OAuth token authentication
                token = await oauth_service.get_token()
                client_params = {
                    "azure_endpoint": settings.azure_openai_endpoint,
                    "azure_ad_token": SecretStr(token),
                    "api_version": settings.azure_openai_api_version,
                    "azure_deployment": deployment_name,
                }
                # Only set temperature for models that support it
                if "o3" not in deployment_name.lower():
                    client_params["temperature"] = 0.7

                self._langchain_client = AzureChatOpenAI(**client_params)
                logger.info("LangChain Azure client initialized with OAuth token")
            else:
                # Fallback to API key authentication
                client_params = {
                    "azure_endpoint": settings.azure_openai_endpoint,
                    "api_key": SecretStr(settings.azure_openai_api_key),
                    "api_version": settings.azure_openai_api_version,
                    "azure_deployment": deployment_name,
                }
                # Only set temperature for models that support it
                if "o3" not in deployment_name.lower():
                    client_params["temperature"] = 0.7

                self._langchain_client = AzureChatOpenAI(**client_params)
                logger.info("LangChain Azure client initialized with API key")

        return self._langchain_client

    def _convert_to_openai_messages(self, messages: List[MessageDict]) -> List[ChatCompletionMessageParam]:
        """Convert message dicts to OpenAI format."""
        openai_messages: List[ChatCompletionMessageParam] = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                openai_messages.append({"role": "system", "content": content})
            elif role == "assistant":
                openai_messages.append({"role": "assistant", "content": content})
            else:  # default to user
                openai_messages.append({"role": "user", "content": content})
        
        return openai_messages

    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate text using Azure OpenAI with LangChain."""
        try:
            model_name = model or settings.azure_openai_deployment_name

            # Prepare messages
            messages: List[BaseMessage] = []
            if system_message:
                messages.append(SystemMessage(content=system_message))
            messages.append(HumanMessage(content=prompt))

            # Get LangChain client and generate
            client = await self._get_langchain_client()

            # Update client parameters
            # For newer models like o3-mini, use bind to set max_completion_tokens
            # and exclude temperature if it's an o3 model
            if "o3" in model_name.lower():
                bound_client = client.bind(max_completion_tokens=max_tokens)
            else:
                client.temperature = temperature
                bound_client = client.bind(max_completion_tokens=max_tokens, temperature=temperature)

            response = await bound_client.ainvoke(messages)

            # Handle response content properly
            content = response.content
            if isinstance(content, list):
                # If content is a list, join it into a string
                content_str = " ".join(str(item) for item in content)
            else:
                content_str = str(content)

            result = {
                "text": content_str,
                "model": model_name,
                "tokens_used": len(content_str.split()),  # Approximate
                "success": True,
            }

            logger.info(f"Text generated successfully using model {model_name}")
            return result

        except Exception as e:
            logger.error(f"Text generation failed: {str(e)}")
            return {
                "text": "",
                "model": model_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    async def generate_text_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system_message: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Generate streaming text using Azure OpenAI."""
        try:
            model_name = model or settings.azure_openai_deployment_name
            client = await self._get_azure_client()

            # Prepare messages in OpenAI format
            message_dicts: List[MessageDict] = []
            if system_message:
                message_dicts.append({"role": "system", "content": system_message})
            message_dicts.append({"role": "user", "content": prompt})
            
            openai_messages = self._convert_to_openai_messages(message_dicts)

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_completion_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Text streaming failed: {str(e)}")
            yield f"Error: {str(e)}"

    async def generate_chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Generate streaming chat responses using Azure OpenAI."""
        try:
            model_name = model or settings.azure_openai_deployment_name
            client = await self._get_azure_client()

            # Convert messages to OpenAI format
            message_dicts: List[MessageDict] = []
            for msg in messages:
                message_dicts.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            openai_messages = self._convert_to_openai_messages(message_dicts)

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_completion_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Chat streaming failed: {str(e)}")
            yield f"Error: {str(e)}"

    async def generate_jira_comment(
        self,
        task_description: str,
        task_type: str = "development",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate Jira task comment using specialized prompt."""
        try:
            # Create specialized Jira prompt template
            jira_prompt = ChatPromptTemplate.from_messages(
                [
                    SystemMessage(
                        content="""你是一个专业的软件开发项目管理助手。请根据Jira任务描述生成详细的工作评论。

评论应该包含：
1. 任务理解和分析
2. 技术实现方案
3. 可能的风险点
4. 预估工作量
5. 测试验证计划

请用中文回复，格式清晰，内容专业。"""
                    ),
                    HumanMessage(
                        content=f"""
任务类型：{task_type}
任务描述：{task_description}
上下文信息：{json.dumps(context or {}, ensure_ascii=False, indent=2)}

请生成详细的工作评论：
"""
                    ),
                ]
            )

            client = await self._get_langchain_client()
            chain = jira_prompt | client | StrOutputParser()

            response = await chain.ainvoke({})

            result = {
                "generated_content": response,
                "suggestions": ["检查任务依赖关系", "评估技术风险", "制定测试计划"],
                "model": settings.azure_openai_deployment_name,
                "tokens_used": len(response.split()),
            }

            logger.info("Jira comment generated successfully")
            return result

        except Exception as e:
            logger.error(f"Jira comment generation failed: {str(e)}")
            return {
                "generated_content": "",
                "suggestions": [],
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "error": str(e),
            }

    async def generate_jira_comment_stream(
        self,
        task_description: str,
        task_type: str = "development",
        context: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        """Generate streaming Jira task comment using specialized prompt."""
        try:
            model_name = settings.azure_openai_deployment_name
            client = await self._get_azure_client()

            # Create specialized Jira prompt
            system_message = """你是一个专业的软件开发项目管理助手。请根据Jira任务描述生成详细的工作评论。

评论应该包含：
1. 任务理解和分析
2. 技术实现方案
3. 可能的风险点
4. 预估工作量
5. 测试验证计划

请用中文回复，格式清晰，内容专业。"""

            user_message = f"""
任务类型：{task_type}
任务描述：{task_description}
上下文信息：{json.dumps(context or {}, ensure_ascii=False, indent=2)}

请生成详细的工作评论：
"""

            message_dicts: List[MessageDict] = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            openai_messages = self._convert_to_openai_messages(message_dicts)

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_completion_tokens=1000,
                temperature=0.7,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Jira comment streaming failed: {str(e)}")
            yield f"Error: {str(e)}"

    async def generate_github_pr_description(
        self,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate GitHub PR description using specialized prompt."""
        try:
            # Create specialized GitHub PR prompt template
            pr_prompt = ChatPromptTemplate.from_messages(
                [
                    SystemMessage(
                        content="""你是一个专业的代码审查和项目管理助手。请根据Pull Request信息生成详细的PR描述。

PR描述应该包含：
1. 📝 变更概述
2. 🔧 技术实现
3. ✅ 测试覆盖
4. 📋 检查清单
5. 🚨 注意事项

请用markdown格式，中英文混合，内容专业准确。"""
                    ),
                    HumanMessage(
                        content=f"""
PR标题：{pr_title}
分支名称：{branch_name}
代码变更：
{code_changes}

提交消息：
{chr(10).join(commit_messages or [])}

请生成详细的PR描述：
"""
                    ),
                ]
            )

            client = await self._get_langchain_client()
            chain = pr_prompt | client | StrOutputParser()

            response = await chain.ainvoke({})

            # Generate suggested title if not provided
            suggested_title = pr_title or "feat: 新功能实现"

            result = {
                "generated_description": response,
                "suggested_title": suggested_title,
                "model": settings.azure_openai_deployment_name,
                "tokens_used": len(response.split()),
            }

            logger.info("GitHub PR description generated successfully")
            return result

        except Exception as e:
            logger.error(f"GitHub PR description generation failed: {str(e)}")
            return {
                "generated_description": "",
                "suggested_title": pr_title or "PR Title",
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "error": str(e),
            }

    async def generate_github_pr_description_stream(
        self,
        pr_title: str,
        code_changes: str,
        branch_name: str = "",
        commit_messages: Optional[List[str]] = None,
    ) -> AsyncIterator[str]:
        """Generate streaming GitHub PR description using specialized prompt."""
        try:
            model_name = settings.azure_openai_deployment_name
            client = await self._get_azure_client()

            # Create specialized GitHub PR prompt
            system_message = """你是一个专业的代码审查和项目管理助手。请根据Pull Request信息生成详细的PR描述。

PR描述应该包含：
1. 📝 变更概述
2. 🔧 技术实现
3. ✅ 测试覆盖
4. 📋 检查清单
5. 🚨 注意事项

请用markdown格式，中英文混合，内容专业准确。"""

            user_message = f"""
PR标题：{pr_title}
分支名称：{branch_name}
代码变更：
{code_changes}

提交消息：
{chr(10).join(commit_messages or [])}

请生成详细的PR描述：
"""

            message_dicts: List[MessageDict] = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            openai_messages = self._convert_to_openai_messages(message_dicts)

            # Stream the response
            stream = await client.chat.completions.create(
                model=model_name,
                messages=openai_messages,
                max_completion_tokens=1000,
                temperature=0.7,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"GitHub PR description streaming failed: {str(e)}")
            yield f"Error: {str(e)}"

    async def refresh_auth(self):
        """Refresh OAuth authentication tokens."""
        try:
            if settings.use_oauth_auth:
                # Force refresh the token
                await oauth_service.get_token(force_refresh=True)
                # Reset clients to force reinitialization with new token
                self._azure_client = None
                self._langchain_client = None
                logger.info("OAuth authentication tokens refreshed")

        except Exception as e:
            logger.error(f"Auth refresh failed: {str(e)}")
            raise


# Global Azure AI service instance
azure_ai_service = AzureAIService()
