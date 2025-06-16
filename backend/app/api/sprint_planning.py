"""Sprint Planning API endpoints."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import time
import psutil
import os

from app.services.sprint_planning_service import sprint_planning_service
from app.services.jira_data_optimizer import jira_data_optimizer
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Request models
class SprintPlanningRequest(BaseModel):
    """Request model for Sprint Planning analysis."""

    boardId: str = Field(..., description="Jira board ID", alias="board_id")
    sprintData: Dict[str, Any] = Field(..., description="Current sprint data extracted from DOM", alias="sprint_data")
    teamMembers: List[Dict[str, Any]] = Field(default=[], description="Team member information", alias="team_members")
    includeAIRecommendations: bool = Field(default=True, description="Whether to include AI recommendations", alias="include_ai_recommendations")
    stream: bool = Field(default=False, description="Whether to stream the response")

    class Config:
        populate_by_name = True


class BoardInfoRequest(BaseModel):
    """Request model for board information."""

    boardId: str = Field(..., description="Jira board ID", alias="board_id")

    class Config:
        populate_by_name = True


class SprintDataRequest(BaseModel):
    """Request model for sprint data extraction."""

    boardId: str = Field(..., description="Jira board ID", alias="board_id")
    sprintId: Optional[str] = Field(None, description="Specific sprint ID, if not provided will get current sprint", alias="sprint_id")

    class Config:
        populate_by_name = True


# Response models
class SprintPlanningResponse(BaseModel):
    """Response model for Sprint Planning analysis."""

    analysisResult: Dict[str, Any] = Field(..., description="Sprint planning analysis results", alias="analysis_result")
    aiRecommendations: List[str] = Field(default=[], description="AI-generated recommendations", alias="ai_recommendations")
    teamWorkload: Dict[str, Any] = Field(..., description="Team workload analysis", alias="team_workload")
    holidayImpact: Optional[Dict[str, Any]] = Field(None, description="Holiday impact analysis", alias="holiday_impact")
    metrics: Dict[str, Any] = Field(..., description="Sprint metrics and statistics")
    model: str = Field(..., description="AI model used for analysis")
    tokensUsed: int = Field(default=0, description="Number of tokens used", alias="tokens_used")
    success: bool = Field(default=True, description="Whether the operation was successful")
    error: Optional[str] = Field(None, description="Error message if any")

    class Config:
        populate_by_name = True


class BoardInfoResponse(BaseModel):
    """Response model for board information."""

    boardId: str = Field(..., description="Board ID", alias="board_id")
    boardName: str = Field(..., description="Board name", alias="board_name")
    projectKey: str = Field(..., description="Project key", alias="project_key")
    success: bool = Field(default=True, description="Whether the operation was successful")
    error: Optional[str] = Field(None, description="Error message if any")

    class Config:
        populate_by_name = True


class SprintDataResponse(BaseModel):
    """Response model for sprint data."""

    sprintId: str = Field(..., description="Sprint ID", alias="sprint_id")
    sprintName: str = Field(..., description="Sprint name", alias="sprint_name")
    sprintState: str = Field(..., description="Sprint state (active, closed, future)", alias="sprint_state")
    issues: List[Dict[str, Any]] = Field(default=[], description="Issues in the sprint")
    totalStoryPoints: int = Field(default=0, description="Total story points in sprint", alias="total_story_points")
    success: bool = Field(default=True, description="Whether the operation was successful")
    error: Optional[str] = Field(None, description="Error message if any")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """Response model for health check."""
    
    status: str = Field(..., description="Service status")
    timestamp: str = Field(..., description="Current timestamp")
    uptime: float = Field(..., description="Service uptime in seconds")
    version: str = Field(default="1.0.0", description="Service version")
    dependencies: Dict[str, str] = Field(default={}, description="Dependencies status")


class PerformanceMetricsResponse(BaseModel):
    """Response model for performance metrics."""
    
    cpu_percent: float = Field(..., description="CPU usage percentage")
    memory_percent: float = Field(..., description="Memory usage percentage")
    memory_available: int = Field(..., description="Available memory in bytes")
    disk_usage: Dict[str, Any] = Field(..., description="Disk usage information")
    api_calls_total: int = Field(default=0, description="Total API calls count")
    api_calls_success: int = Field(default=0, description="Successful API calls count")
    api_calls_error: int = Field(default=0, description="Failed API calls count")
    response_time_avg: float = Field(default=0.0, description="Average response time")


# Global metrics tracking
_start_time = time.time()
_api_calls_total = 0
_api_calls_success = 0
_api_calls_error = 0
_response_times = []


# Endpoints
@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health check endpoint."""
    try:
        uptime = time.time() - _start_time
        
        # Check dependencies
        dependencies = {}
        try:
            # Test Jira data optimizer
            await jira_data_optimizer.get_data_source_recommendation("test")
            dependencies["jira_optimizer"] = "healthy"
        except Exception:
            dependencies["jira_optimizer"] = "degraded"
        
        try:
            # Test sprint planning service
            dependencies["sprint_planning"] = "healthy"
        except Exception:
            dependencies["sprint_planning"] = "degraded"
        
        return HealthResponse(
            status="healthy",
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            uptime=uptime,
            version="1.0.0",
            dependencies=dependencies
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service unhealthy")


@router.get("/performance-metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics():
    """Get system performance metrics."""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        avg_response_time = sum(_response_times) / len(_response_times) if _response_times else 0.0
        
        return PerformanceMetricsResponse(
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_available=memory.available,
            disk_usage={
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            api_calls_total=_api_calls_total,
            api_calls_success=_api_calls_success,
            api_calls_error=_api_calls_error,
            response_time_avg=avg_response_time
        )
    except Exception as e:
        logger.error(f"Performance metrics retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=SprintPlanningResponse)
async def analyze_sprint_planning(request: SprintPlanningRequest):
    """Analyze Sprint Planning data and generate recommendations."""
    global _api_calls_total, _api_calls_success, _api_calls_error, _response_times
    start_time = time.time()
    _api_calls_total += 1
    
    try:
        logger.info(f"Analyzing Sprint Planning for board {request.boardId}")

        if request.stream:
            # Return streaming response for AI recommendations
            async def generate_stream():
                try:
                    result = await sprint_planning_service.analyze_sprint_planning(
                        board_id=request.boardId,
                        sprint_data=request.sprintData,
                        team_members=request.teamMembers,
                        include_ai_recommendations=request.includeAIRecommendations
                    )

                    # Stream the AI recommendations if available
                    if result.get("ai_recommendations"):
                        for recommendation in result["ai_recommendations"]:
                            yield f"data: {recommendation}\n\n"
                    
                    # Send final result
                    yield f"data: [DONE]\n\n"

                except Exception as e:
                    logger.error(f"Sprint Planning analysis streaming failed: {str(e)}")
                    yield f"data: [ERROR] {str(e)}\n\n"

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
            # Non-streaming response
            result = await sprint_planning_service.analyze_sprint_planning(
                board_id=request.boardId,
                sprint_data=request.sprintData,
                team_members=request.teamMembers,
                include_ai_recommendations=request.includeAIRecommendations
            )

            response_time = time.time() - start_time
            _response_times.append(response_time)
            if len(_response_times) > 100:  # Keep only last 100 measurements
                _response_times.pop(0)
            _api_calls_success += 1
            
            return SprintPlanningResponse(**result)

    except Exception as e:
        _api_calls_error += 1
        logger.error(f"Sprint Planning analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/board-info/{board_id}", response_model=BoardInfoResponse)
async def get_board_info(board_id: str):
    """Get board information by board ID."""
    global _api_calls_total, _api_calls_success, _api_calls_error, _response_times
    start_time = time.time()
    _api_calls_total += 1
    
    try:
        logger.info(f"Getting board info for board {board_id}")

        result = await sprint_planning_service.get_board_info(board_id)
        
        response_time = time.time() - start_time
        _response_times.append(response_time)
        if len(_response_times) > 100:
            _response_times.pop(0)
        _api_calls_success += 1
        
        return BoardInfoResponse(**result)

    except Exception as e:
        _api_calls_error += 1
        logger.error(f"Board info retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sprint-data/{board_id}", response_model=SprintDataResponse)
async def get_sprint_data(board_id: str, sprint_id: Optional[str] = None):
    """Get sprint data for a specific board and sprint."""
    global _api_calls_total, _api_calls_success, _api_calls_error, _response_times
    start_time = time.time()
    _api_calls_total += 1
    
    try:
        logger.info(f"Getting sprint data for board {board_id}, sprint {sprint_id}")

        result = await sprint_planning_service.get_sprint_data(board_id, sprint_id)
        
        response_time = time.time() - start_time
        _response_times.append(response_time)
        if len(_response_times) > 100:
            _response_times.pop(0)
        _api_calls_success += 1
        
        return SprintDataResponse(**result)

    except Exception as e:
        _api_calls_error += 1
        logger.error(f"Sprint data retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/team-workload")
async def analyze_team_workload(request: SprintPlanningRequest):
    """Analyze team workload distribution."""
    global _api_calls_total, _api_calls_success, _api_calls_error, _response_times
    start_time = time.time()
    _api_calls_total += 1
    
    try:
        logger.info(f"Analyzing team workload for board {request.boardId}")

        result = await sprint_planning_service.analyze_team_workload(
            sprint_data=request.sprintData,
            team_members=request.teamMembers
        )

        response_time = time.time() - start_time
        _response_times.append(response_time)
        if len(_response_times) > 100:
            _response_times.pop(0)
        _api_calls_success += 1

        return {"workload_analysis": result, "success": True}

    except Exception as e:
        _api_calls_error += 1
        logger.error(f"Team workload analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-source-recommendation/{board_id}")
async def get_data_source_recommendation(board_id: str):
    """Get data source recommendation for optimal data retrieval strategy."""
    global _api_calls_total, _api_calls_success, _api_calls_error, _response_times
    start_time = time.time()
    _api_calls_total += 1
    
    try:
        logger.info(f"Getting data source recommendation for board {board_id}")

        result = await jira_data_optimizer.get_data_source_recommendation(board_id)
        
        response_time = time.time() - start_time
        _response_times.append(response_time)
        if len(_response_times) > 100:
            _response_times.pop(0)
        _api_calls_success += 1
        
        return {"recommendation": result, "success": True}

    except Exception as e:
        _api_calls_error += 1
        logger.error(f"Data source recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
