"""Sprint Planning service for AI-powered analysis and recommendations."""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta

from app.services.jira.holiday_service import holiday_service
from app.services.base_ai import BaseAzureAIService
from app.services.ai_recommendations_service import ai_recommendations_service
from app.services.performance_monitor import performance_monitor
from app.services.jira.jira_rest_client import jira_rest_client
from app.services.jira.jira_data_optimizer import jira_data_optimizer
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class SprintPlanningService(BaseAzureAIService):
    """Sprint Planning service for AI-powered analysis and recommendations."""

    def __init__(self):
        """Initialize Sprint Planning service."""
        super().__init__()
        logger.info("Sprint Planning service initialized")

    @performance_monitor.performance_tracker("analyze_sprint_planning")
    async def analyze_sprint_planning(
        self,
        board_id: str,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]],
        include_ai_recommendations: bool = True
    ) -> Dict[str, Any]:
        """Analyze Sprint Planning data and generate recommendations."""
        try:
            logger.info(f"Analyzing Sprint Planning for board {board_id}")

            # Extract basic metrics from sprint data
            metrics = self._calculate_basic_metrics(sprint_data, team_members)
            
            # Analyze team workload
            team_workload = self._analyze_team_workload_internal(sprint_data, team_members)

            # Analyze holiday impact
            holiday_impact = await self._analyze_holiday_impact(sprint_data, team_members)

            # Generate AI recommendations if requested
            ai_recommendations = []
            if include_ai_recommendations:
                # Use advanced AI recommendations service
                advanced_recommendations = await ai_recommendations_service.generate_advanced_recommendations(
                    sprint_data, team_members, metrics, holiday_impact
                )

                # Convert to simple format for backward compatibility
                ai_recommendations = [
                    rec.get("description", rec.get("title", ""))
                    for rec in advanced_recommendations
                ]

                # Store detailed recommendations in result
                result_recommendations = advanced_recommendations

            result = {
                "analysis_result": {
                    "board_id": board_id,
                    "sprint_summary": self._extract_sprint_summary(sprint_data),
                    "analysis_timestamp": self._get_current_timestamp()
                },
                "ai_recommendations": ai_recommendations,
                "detailed_recommendations": advanced_recommendations if include_ai_recommendations else [],
                "team_workload": team_workload,
                "holiday_impact": holiday_impact,
                "metrics": metrics,
                "model": settings.azure_openai_deployment_name,
                "tokens_used": len(str(sprint_data)) // 4,  # Rough estimate
                "success": True
            }

            logger.info("Sprint Planning analysis completed successfully")
            return result

        except Exception as e:
            logger.error(f"Sprint Planning analysis failed: {str(e)}")
            return {
                "analysis_result": {},
                "ai_recommendations": [],
                "team_workload": {},
                "metrics": {},
                "model": settings.azure_openai_deployment_name,
                "tokens_used": 0,
                "success": False,
                "error": str(e),
            }

    @performance_monitor.performance_tracker("get_board_info")
    async def get_board_info(self, board_id: str, dom_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Get board information by board ID using optimized data source selection."""
        try:
            logger.info(f"Getting optimized board info for {board_id}")
            
            # Use the data optimizer for intelligent source selection
            result = await jira_data_optimizer.get_optimized_board_info(board_id, dom_data)
            
            logger.info(f"Board info retrieved using {result.get('data_source', 'unknown')} source")
            return result

        except Exception as e:
            logger.error(f"Optimized board info retrieval failed: {str(e)}")
            return {
                "board_id": board_id,
                "board_name": "",
                "project_key": "",
                "success": False,
                "error": str(e),
                "data_source": "error"
            }

    async def get_sprint_data(
        self, 
        board_id: str, 
        sprint_id: Optional[str] = None, 
        dom_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Get sprint data for a specific board and sprint using optimized data source selection."""
        try:
            logger.info(f"Getting optimized sprint data for board {board_id}, sprint {sprint_id}")

            # Use the data optimizer for intelligent source selection
            result = await jira_data_optimizer.get_optimized_sprint_data(board_id, sprint_id, dom_data)
            
            logger.info(f"Sprint data retrieved using {result.get('data_source', 'unknown')} source")
            return result

        except Exception as e:
            logger.error(f"Optimized sprint data retrieval failed: {str(e)}")
            return {
                "sprint_id": sprint_id or "",
                "sprint_name": "",
                "sprint_state": "unknown",
                "issues": [],
                "total_story_points": 0,
                "success": False,
                "error": str(e)
            }

    async def analyze_team_workload(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze team workload distribution."""
        try:
            return self._analyze_team_workload_internal(sprint_data, team_members)
        except Exception as e:
            logger.error(f"Team workload analysis failed: {str(e)}")
            return {"error": str(e)}

    def _calculate_basic_metrics(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate basic Sprint metrics."""
        try:
            issues = sprint_data.get("issues", [])
            
            # Calculate total story points
            total_story_points = sum(
                issue.get("story_points", 0) for issue in issues
            )
            
            # Calculate team velocity (mock data for now)
            team_velocity = [35, 42, 38, 40, 36]  # Last 5 sprints
            avg_velocity = sum(team_velocity) / len(team_velocity) if team_velocity else 0
            
            # Calculate utilization rate
            utilization_rate = (total_story_points / avg_velocity * 100) if avg_velocity > 0 else 0
            
            return {
                "total_story_points": total_story_points,
                "team_velocity": team_velocity,
                "avg_velocity": avg_velocity,
                "utilization_rate": round(utilization_rate, 1),
                "team_size": len(team_members)
            }
        except Exception as e:
            logger.error(f"Basic metrics calculation failed: {str(e)}")
            return {}

    def _analyze_team_workload_internal(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Internal method to analyze team workload."""
        try:
            issues = sprint_data.get("issues", [])
            
            # Group issues by assignee
            workload_by_member = {}
            unassigned_points = 0
            
            for issue in issues:
                assignee = issue.get("assignee", {})
                assignee_id = assignee.get("id", "unassigned")
                story_points = issue.get("story_points", 0)
                
                if assignee_id == "unassigned":
                    unassigned_points += story_points
                else:
                    if assignee_id not in workload_by_member:
                        workload_by_member[assignee_id] = {
                            "name": assignee.get("name", "Unknown"),
                            "current_sprint_points": 0,
                            "carry_over_points": 0,  # Would be calculated from previous sprint
                            "total_workload": 0,
                            "issue_count": 0
                        }
                    
                    workload_by_member[assignee_id]["current_sprint_points"] += story_points
                    workload_by_member[assignee_id]["total_workload"] += story_points
                    workload_by_member[assignee_id]["issue_count"] += 1

            # Determine workload status for each member
            for member_id, workload in workload_by_member.items():
                total_points = workload["total_workload"]
                if total_points <= 8:
                    status = "normal"
                elif total_points <= 12:
                    status = "high"
                else:
                    status = "overloaded"
                
                workload["status"] = status

            return {
                "member_workloads": workload_by_member,
                "unassigned_points": unassigned_points,
                "total_assigned_points": sum(w["total_workload"] for w in workload_by_member.values())
            }
        except Exception as e:
            logger.error(f"Team workload analysis failed: {str(e)}")
            return {}

    async def _analyze_holiday_impact(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze holiday impact on sprint capacity."""
        try:
            # Extract sprint dates from sprint data
            sprint = sprint_data.get("sprint", {})
            start_date = sprint.get("startDate")
            end_date = sprint.get("endDate")

            if not start_date or not end_date:
                # Use default 2-week sprint if dates not available
                now = datetime.now()
                start_date = now.isoformat()
                end_date = (now + timedelta(days=14)).isoformat()

            # Analyze holiday impact using holiday service
            holiday_analysis = await holiday_service.analyze_holiday_impact(
                sprint_start_date=start_date,
                sprint_end_date=end_date,
                team_members=team_members,
                regions=["CN", "US", "IN"]  # Default regions
            )

            return holiday_analysis

        except Exception as e:
            logger.error(f"Holiday impact analysis failed: {str(e)}")
            return {
                "holidays_in_sprint": [],
                "impact_analysis": {},
                "recommendations": [],
                "total_capacity_reduction": 0,
                "affected_members_count": 0,
                "success": False,
                "error": str(e)
            }

    async def _generate_ai_recommendations(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        holiday_impact: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """Generate AI-powered recommendations."""
        try:
            # For now, return basic rule-based recommendations
            # In full implementation, this would use AI prompts
            recommendations = []

            utilization_rate = metrics.get("utilization_rate", 0)
            if utilization_rate > 120:
                recommendations.append("⚠️ Sprint appears overloaded (>120% capacity). Consider moving some items to backlog.")
            elif utilization_rate < 80:
                recommendations.append("📈 Sprint has available capacity (<80%). Consider adding more items from backlog.")

            # Check for unassigned work
            workload_data = self._analyze_team_workload_internal(sprint_data, team_members)
            unassigned_points = workload_data.get("unassigned_points", 0)
            if unassigned_points > 0:
                recommendations.append(f"👤 {unassigned_points} story points are unassigned. Consider distributing among team members.")

            # Add holiday-based recommendations
            if holiday_impact and holiday_impact.get("success", False):
                capacity_reduction = holiday_impact.get("total_capacity_reduction", 0)
                if capacity_reduction > 10:
                    recommendations.append(f"🏖️ Holiday impact detected ({capacity_reduction}% capacity reduction). Consider adjusting sprint scope.")

                holiday_recommendations = holiday_impact.get("recommendations", [])
                recommendations.extend(holiday_recommendations)

            return recommendations
        except Exception as e:
            logger.error(f"AI recommendations generation failed: {str(e)}")
            return []

    def _extract_sprint_summary(self, sprint_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract sprint summary information."""
        return {
            "sprint_name": sprint_data.get("sprint_name", "Unknown Sprint"),
            "sprint_state": sprint_data.get("sprint_state", "unknown"),
            "issue_count": len(sprint_data.get("issues", [])),
            "start_date": sprint_data.get("start_date"),
            "end_date": sprint_data.get("end_date")
        }

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        return datetime.now().isoformat()


# Global Sprint Planning service instance
sprint_planning_service = SprintPlanningService()
