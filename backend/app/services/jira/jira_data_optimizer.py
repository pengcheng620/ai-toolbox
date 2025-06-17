"""Jira Data Optimizer - 智能数据源选择和优化

此服务负责：
1. 智能选择最佳数据源（API vs DOM vs 混合模式）
2. 优化数据获取流程
3. 处理认证问题和错误恢复
4. 数据质量评估和补全
"""

from typing import Dict, Any, List, Optional, Union
from enum import Enum
import asyncio
from datetime import datetime

from .jira_rest_client import JiraRESTClient
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DataSource(Enum):
    """数据源类型"""
    API = "api"
    DOM = "dom"
    MOCK = "mock"
    HYBRID = "hybrid"


class DataQuality(Enum):
    """数据质量等级"""
    HIGH = "high"       # 完整且准确的数据
    MEDIUM = "medium"   # 部分数据缺失但可用
    LOW = "low"         # 数据不完整或不准确
    FAILED = "failed"   # 数据获取失败


class JiraDataOptimizer:
    """Jira 数据获取优化器"""

    def __init__(self):
        """初始化优化器"""
        self.api_client = None
        self.api_available = False
        self._last_api_check = None
        self._api_check_interval = 300  # 5分钟检查一次 API 可用性
        
        logger.info("Jira Data Optimizer initialized")

    async def get_optimized_board_info(self, board_id: str, dom_data: Optional[Dict] = None) -> Dict[str, Any]:
        """获取优化的看板信息
        
        Args:
            board_id: 看板ID
            dom_data: 从前端DOM解析的数据（可选）
            
        Returns:
            优化后的看板信息
        """
        try:
            logger.info(f"Getting optimized board info for {board_id}")
            
            # 1. 尝试API方式
            api_result = await self._try_api_board_info(board_id)
            
            # 2. 评估数据质量并决定最佳方案
            if api_result and api_result.get("quality") in [DataQuality.HIGH, DataQuality.MEDIUM]:
                logger.info(f"Using API data for board {board_id} (quality: {api_result['quality'].value})")
                return api_result
            
            # 3. API不可用，使用DOM数据
            if dom_data:
                logger.info(f"API unavailable, using DOM data for board {board_id}")
                return self._enhance_dom_board_data(board_id, dom_data)
            
            # 4. 最后回退到模拟数据
            logger.warning(f"No data sources available, using mock data for board {board_id}")
            return self._generate_mock_board_data(board_id)
            
        except Exception as e:
            logger.error(f"Failed to get optimized board info: {e}")
            return self._generate_error_response("board_info", str(e))

    async def get_optimized_sprint_data(
        self, 
        board_id: str, 
        sprint_id: Optional[str] = None, 
        dom_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """获取优化的Sprint数据
        
        Args:
            board_id: 看板ID
            sprint_id: Sprint ID（可选，为空时获取活跃Sprint）
            dom_data: 从前端DOM解析的数据（可选）
            
        Returns:
            优化后的Sprint数据
        """
        try:
            logger.info(f"Getting optimized sprint data for board {board_id}, sprint {sprint_id}")
            
            # 1. 尝试API方式
            api_result = await self._try_api_sprint_data(board_id, sprint_id)
            
            # 2. 评估API数据质量
            if api_result and api_result.get("quality") in [DataQuality.HIGH, DataQuality.MEDIUM]:
                logger.info(f"Using API data for sprint (quality: {api_result['quality'].value})")
                
                # 如果有DOM数据，进行数据补强
                if dom_data:
                    return await self._enhance_api_with_dom(api_result, dom_data)
                return api_result
            
            # 3. API不可用或质量差，使用DOM数据
            if dom_data:
                logger.info(f"Using DOM data for sprint {sprint_id or 'active'}")
                return self._enhance_dom_sprint_data(board_id, sprint_id, dom_data)
            
            # 4. 最后回退到模拟数据
            logger.warning(f"No data sources available, using mock data for sprint")
            return self._generate_mock_sprint_data(board_id, sprint_id)
            
        except Exception as e:
            logger.error(f"Failed to get optimized sprint data: {e}")
            return self._generate_error_response("sprint_data", str(e))

    async def _try_api_board_info(self, board_id: str) -> Optional[Dict[str, Any]]:
        """尝试通过API获取看板信息"""
        if not await self._check_api_availability():
            return None
            
        try:
            async with JiraRESTClient() as client:
                result = await client.get_board_info(board_id)
                
                if result.get("success"):
                    return {
                        **result,
                        "data_source": DataSource.API.value,
                        "quality": DataQuality.HIGH,
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    logger.warning(f"API board info failed: {result.get('error', 'Unknown error')}")
                    # 检查是否是认证问题
                    if "Authentication" in str(result.get('error', '')):
                        self.api_available = False
                        logger.info("API authentication failed, marking API as unavailable")
                    return None
                    
        except Exception as e:
            logger.error(f"API board info exception: {e}")
            return None

    async def _try_api_sprint_data(self, board_id: str, sprint_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """尝试通过API获取Sprint数据"""
        if not await self._check_api_availability():
            return None
            
        try:
            async with JiraRESTClient() as client:
                # 获取活跃Sprint（如果没有指定sprint_id）
                if not sprint_id:
                    sprint_result = await client.get_active_sprint(board_id)
                    if not sprint_result.get("success"):
                        return None
                    sprint_id = sprint_result.get("sprint_id")
                    sprint_info = sprint_result
                else:
                    # 对于指定的sprint_id，创建基本信息
                    sprint_info = {
                        "sprint_id": sprint_id,
                        "sprint_name": f"Sprint {sprint_id}",
                        "sprint_state": "active",
                        "success": True
                    }
                
                # 获取Sprint问题
                if sprint_id:
                    issues_result = await client.get_sprint_issues(sprint_id)
                    if issues_result.get("success"):
                        return {
                            "sprint_id": sprint_id,
                            "sprint_name": sprint_info.get("sprint_name", f"Sprint {sprint_id}"),
                            "sprint_state": sprint_info.get("sprint_state", "active"),
                            "start_date": sprint_info.get("start_date"),
                            "end_date": sprint_info.get("end_date"),
                            "goal": sprint_info.get("goal", ""),
                            "issues": issues_result["issues"],
                            "total_story_points": issues_result["total_story_points"],
                            "total_issues": issues_result["total_issues"],
                            "data_source": DataSource.API.value,
                            "quality": DataQuality.HIGH,
                            "timestamp": datetime.now().isoformat(),
                            "success": True
                        }
                        
                logger.warning(f"API sprint data incomplete for {board_id}/{sprint_id}")
                return None
                
        except Exception as e:
            logger.error(f"API sprint data exception: {e}")
            return None

    async def _check_api_availability(self) -> bool:
        """检查API可用性"""
        # 如果明确禁用API，直接返回False
        if not settings.jira_enable_api:
            return False
            
        # 如果配置不完整，返回False
        if not settings.jira_api_enabled:
            return False
        
        # 如果最近检查过且不可用，短期内不重试
        now = datetime.now()
        if (self._last_api_check and 
            (now - self._last_api_check).seconds < self._api_check_interval and 
            not self.api_available):
            return False
        
        # 尝试快速API测试
        try:
            async with JiraRESTClient() as client:
                # 使用最简单的API调用来测试连接
                result = await client.get_board_info("1")  # 测试看板ID 1
                self.api_available = not ("Authentication" in str(result.get('error', '')) or 
                                        "403" in str(result.get('error', '')))
                self._last_api_check = now
                
                if not self.api_available:
                    logger.info("API authentication check failed, API marked unavailable")
                else:
                    logger.info("API availability confirmed")
                    
                return self.api_available
                
        except Exception as e:
            logger.warning(f"API availability check failed: {e}")
            self.api_available = False
            self._last_api_check = now
            return False

    def _enhance_dom_board_data(self, board_id: str, dom_data: Dict) -> Dict[str, Any]:
        """增强DOM看板数据"""
        return {
            "board_id": board_id,
            "board_name": dom_data.get("board_name", f"Board {board_id}"),
            "project_key": dom_data.get("project_key", f"PROJ-{board_id[:3].upper()}"),
            "project_name": dom_data.get("project_name", ""),
            "data_source": DataSource.DOM.value,
            "quality": DataQuality.MEDIUM,
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "dom_metadata": {
                "parsing_success": True,
                "elements_found": len(dom_data.keys())
            }
        }

    def _enhance_dom_sprint_data(self, board_id: str, sprint_id: Optional[str], dom_data: Dict) -> Dict[str, Any]:
        """增强DOM Sprint数据"""
        issues = dom_data.get("issues", [])
        total_story_points = sum(issue.get("story_points", 0) for issue in issues)
        
        return {
            "sprint_id": sprint_id or dom_data.get("sprint_id", f"sprint-{board_id}-current"),
            "sprint_name": dom_data.get("sprint_name", f"Sprint {sprint_id or 'Current'}"),
            "sprint_state": dom_data.get("sprint_state", "active"),
            "issues": issues,
            "total_story_points": total_story_points,
            "total_issues": len(issues),
            "data_source": DataSource.DOM.value,
            "quality": DataQuality.MEDIUM,
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "dom_metadata": {
                "parsing_success": True,
                "issues_parsed": len(issues),
                "story_points_available": sum(1 for issue in issues if issue.get("story_points", 0) > 0)
            }
        }

    async def _enhance_api_with_dom(self, api_data: Dict, dom_data: Dict) -> Dict[str, Any]:
        """使用DOM数据增强API数据"""
        # 合并数据，API数据优先，DOM数据补充
        enhanced_data = api_data.copy()
        enhanced_data["data_source"] = DataSource.HYBRID.value
        enhanced_data["quality"] = DataQuality.HIGH
        
        # DOM数据可以提供的额外信息
        dom_enhancements = {
            "ui_context": dom_data.get("ui_context", {}),
            "visual_status": dom_data.get("visual_status", {}),
            "user_interactions": dom_data.get("user_interactions", {})
        }
        
        enhanced_data["dom_enhancements"] = dom_enhancements
        return enhanced_data

    def _generate_mock_board_data(self, board_id: str) -> Dict[str, Any]:
        """生成模拟看板数据"""
        return {
            "board_id": board_id,
            "board_name": f"Board {board_id}",
            "project_key": f"PROJ-{board_id[:3].upper()}",
            "project_name": f"Project {board_id}",
            "data_source": DataSource.MOCK.value,
            "quality": DataQuality.LOW,
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "note": "Mock data - configure Jira API or use DOM parsing for real data"
        }

    def _generate_mock_sprint_data(self, board_id: str, sprint_id: Optional[str]) -> Dict[str, Any]:
        """生成模拟Sprint数据"""
        actual_sprint_id = sprint_id or f"sprint-{board_id}-current"
        return {
            "sprint_id": actual_sprint_id,
            "sprint_name": f"Sprint {sprint_id or 'Current'}",
            "sprint_state": "active",
            "issues": [],
            "total_story_points": 0,
            "total_issues": 0,
            "data_source": DataSource.MOCK.value,
            "quality": DataQuality.LOW,
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "note": "Mock data - configure Jira API or use DOM parsing for real data"
        }

    def _generate_error_response(self, operation: str, error_message: str) -> Dict[str, Any]:
        """生成错误响应"""
        return {
            "operation": operation,
            "success": False,
            "error": error_message,
            "data_source": "error",
            "quality": DataQuality.FAILED,
            "timestamp": datetime.now().isoformat()
        }

    async def get_data_source_recommendation(self, board_id: str) -> Dict[str, Any]:
        """获取数据源推荐"""
        api_status = await self._check_api_availability()
        
        recommendation = {
            "board_id": board_id,
            "timestamp": datetime.now().isoformat(),
            "api_available": api_status,
            "jira_api_enabled": settings.jira_api_enabled,
            "recommended_strategy": None,
            "explanation": "",
            "alternatives": []
        }
        
        if api_status:
            recommendation["recommended_strategy"] = "api_primary"
            recommendation["explanation"] = "Jira API is available and should be used as primary data source"
            recommendation["alternatives"] = ["hybrid", "dom_fallback"]
        else:
            recommendation["recommended_strategy"] = "dom_primary"
            if not settings.jira_api_enabled:
                recommendation["explanation"] = "Jira API is not configured. Use DOM parsing as primary method."
            else:
                recommendation["explanation"] = "Jira API authentication failed (likely due to disabled Basic Auth). Use DOM parsing as primary method."
            recommendation["alternatives"] = ["mock_fallback"]
        
        return recommendation


# 全局实例
jira_data_optimizer = JiraDataOptimizer() 