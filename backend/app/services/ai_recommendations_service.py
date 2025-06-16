"""Advanced AI-powered recommendations engine for Sprint Planning."""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json

from app.services.base_ai import BaseAzureAIService
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class AIRecommendationsService(BaseAzureAIService):
    """Advanced AI recommendations service with context-aware analysis."""

    def __init__(self):
        """Initialize AI Recommendations service."""
        super().__init__()
        logger.info("AI Recommendations service initialized")
        
        # Recommendation categories and their weights
        self.recommendation_categories = {
            "capacity_optimization": {
                "weight": 0.4,
                "description": "Optimize team capacity and workload distribution"
            },
            "risk_mitigation": {
                "weight": 0.3,
                "description": "Identify and mitigate potential sprint risks"
            },
            "process_improvement": {
                "weight": 0.3,
                "description": "Improve team processes and efficiency"
            }
        }

    async def generate_advanced_recommendations(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        holiday_impact: Optional[Dict[str, Any]] = None,
        historical_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate advanced AI-powered recommendations with context awareness."""
        try:
            logger.info("Generating advanced AI recommendations")
            
            # Analyze current sprint context
            context = self._analyze_sprint_context(sprint_data, team_members, metrics, holiday_impact)
            
            # Generate recommendations by category
            recommendations = []
            
            # Capacity optimization recommendations
            capacity_recs = await self._generate_capacity_recommendations(context)
            recommendations.extend(capacity_recs)
            
            # Risk mitigation recommendations
            risk_recs = await self._generate_risk_recommendations(context)
            recommendations.extend(risk_recs)
            
            # Process improvement recommendations
            process_recs = await self._generate_process_recommendations(context)
            recommendations.extend(process_recs)
            
            # Sort by confidence score and priority
            recommendations.sort(key=lambda x: (x["priority_score"], x["confidence"]), reverse=True)
            
            logger.info(f"Generated {len(recommendations)} advanced recommendations")
            return recommendations[:10]  # Return top 10 recommendations
            
        except Exception as e:
            logger.error(f"Advanced recommendations generation failed: {str(e)}")
            return []

    def _analyze_sprint_context(
        self,
        sprint_data: Dict[str, Any],
        team_members: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        holiday_impact: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze sprint context for recommendation generation."""
        
        issues = sprint_data.get("issues", [])
        total_points = sprint_data.get("totalStoryPoints", 0)
        team_size = len(team_members)
        
        # Calculate workload distribution
        workload_variance = self._calculate_workload_variance(issues, team_members)
        
        # Analyze velocity trends
        velocity_data = metrics.get("teamVelocity", [])
        velocity_trend = self._analyze_velocity_trend(velocity_data)
        
        # Calculate capacity utilization
        utilization_rate = metrics.get("utilizationRate", 0)
        
        # Analyze holiday impact
        holiday_capacity_reduction = 0
        if holiday_impact and holiday_impact.get("success", False):
            holiday_capacity_reduction = holiday_impact.get("total_capacity_reduction", 0)
        
        # Detect bottlenecks
        bottlenecks = self._detect_bottlenecks(issues, team_members)
        
        context = {
            "total_story_points": total_points,
            "team_size": team_size,
            "workload_variance": workload_variance,
            "velocity_trend": velocity_trend,
            "utilization_rate": utilization_rate,
            "holiday_capacity_reduction": holiday_capacity_reduction,
            "bottlenecks": bottlenecks,
            "issues_count": len(issues),
            "avg_points_per_member": total_points / team_size if team_size > 0 else 0,
            "sprint_health_score": self._calculate_sprint_health_score(
                utilization_rate, workload_variance, holiday_capacity_reduction
            )
        }
        
        return context

    async def _generate_capacity_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate capacity optimization recommendations."""
        recommendations = []
        
        utilization_rate = context["utilization_rate"]
        workload_variance = context["workload_variance"]
        holiday_impact = context["holiday_capacity_reduction"]
        
        # Over-capacity recommendation
        if utilization_rate > 120:
            recommendations.append({
                "id": "capacity_overload",
                "category": "capacity_optimization",
                "priority": "high",
                "priority_score": 90,
                "confidence": 0.95,
                "title": "Sprint 容量过载警告",
                "description": f"当前 Sprint 容量利用率为 {utilization_rate}%，超出建议范围。",
                "impact": "high",
                "actionable_steps": [
                    "将低优先级任务移至下个 Sprint",
                    "重新评估任务复杂度估算",
                    "考虑增加团队资源或延长 Sprint 时间"
                ],
                "expected_outcome": f"将容量利用率降低至 80-100% 范围内",
                "effort_required": "medium",
                "timeline": "immediate"
            })
        
        # Under-capacity recommendation
        elif utilization_rate < 70:
            recommendations.append({
                "id": "capacity_underutilized",
                "category": "capacity_optimization",
                "priority": "medium",
                "priority_score": 60,
                "confidence": 0.85,
                "title": "Sprint 容量未充分利用",
                "description": f"当前 Sprint 容量利用率仅为 {utilization_rate}%，可以承担更多工作。",
                "impact": "medium",
                "actionable_steps": [
                    "从 Backlog 中添加高优先级任务",
                    "考虑提前开始下个 Sprint 的准备工作",
                    "安排技术债务清理或改进任务"
                ],
                "expected_outcome": f"提高容量利用率至 80-100% 范围",
                "effort_required": "low",
                "timeline": "within_sprint"
            })
        
        # Workload imbalance recommendation
        if workload_variance > 0.3:
            recommendations.append({
                "id": "workload_imbalance",
                "category": "capacity_optimization",
                "priority": "high",
                "priority_score": 85,
                "confidence": 0.90,
                "title": "团队工作负载分配不均",
                "description": f"团队成员间工作负载差异较大（方差: {workload_variance:.2f}）。",
                "impact": "high",
                "actionable_steps": [
                    "重新分配任务以平衡工作负载",
                    "识别技能瓶颈并安排知识分享",
                    "考虑结对编程或协作开发"
                ],
                "expected_outcome": "实现更均衡的工作负载分配",
                "effort_required": "medium",
                "timeline": "within_sprint"
            })
        
        # Holiday impact recommendation
        if holiday_impact > 15:
            recommendations.append({
                "id": "holiday_capacity_adjustment",
                "category": "capacity_optimization",
                "priority": "high",
                "priority_score": 88,
                "confidence": 0.92,
                "title": "假期影响容量调整",
                "description": f"假期将导致 {holiday_impact}% 的容量减少。",
                "impact": "high",
                "actionable_steps": [
                    f"调整 Sprint 承诺，减少 {holiday_impact}% 的工作量",
                    "优先完成关键任务",
                    "安排假期前的知识交接"
                ],
                "expected_outcome": "避免因假期导致的 Sprint 目标未达成",
                "effort_required": "low",
                "timeline": "immediate"
            })
        
        return recommendations

    async def _generate_risk_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate risk mitigation recommendations."""
        recommendations = []
        
        sprint_health = context["sprint_health_score"]
        bottlenecks = context["bottlenecks"]
        velocity_trend = context["velocity_trend"]
        
        # Sprint health risk
        if sprint_health < 0.6:
            recommendations.append({
                "id": "sprint_health_risk",
                "category": "risk_mitigation",
                "priority": "high",
                "priority_score": 95,
                "confidence": 0.88,
                "title": "Sprint 健康度风险警告",
                "description": f"Sprint 健康度评分较低 ({sprint_health:.2f}/1.0)，存在交付风险。",
                "impact": "high",
                "actionable_steps": [
                    "召开紧急团队会议评估风险",
                    "重新评估 Sprint 目标的可行性",
                    "识别并移除阻碍因素"
                ],
                "expected_outcome": "提高 Sprint 成功交付概率",
                "effort_required": "high",
                "timeline": "immediate"
            })
        
        # Velocity decline risk
        if velocity_trend == "declining":
            recommendations.append({
                "id": "velocity_decline_risk",
                "category": "risk_mitigation",
                "priority": "medium",
                "priority_score": 70,
                "confidence": 0.80,
                "title": "团队速度下降趋势",
                "description": "团队速度呈下降趋势，可能影响未来 Sprint 交付能力。",
                "impact": "medium",
                "actionable_steps": [
                    "分析速度下降的根本原因",
                    "检查团队是否面临技术或流程障碍",
                    "考虑团队培训或流程优化"
                ],
                "expected_outcome": "稳定或提升团队交付速度",
                "effort_required": "medium",
                "timeline": "next_sprint"
            })
        
        # Bottleneck risks
        for bottleneck in bottlenecks:
            recommendations.append({
                "id": f"bottleneck_risk_{bottleneck['type']}",
                "category": "risk_mitigation",
                "priority": "medium",
                "priority_score": 75,
                "confidence": 0.85,
                "title": f"{bottleneck['description']} 瓶颈风险",
                "description": f"检测到 {bottleneck['description']} 可能成为交付瓶颈。",
                "impact": "medium",
                "actionable_steps": [
                    f"增加 {bottleneck['type']} 相关的资源投入",
                    "安排知识分享和技能培训",
                    "考虑任务重新分配或外部支持"
                ],
                "expected_outcome": f"消除 {bottleneck['type']} 瓶颈",
                "effort_required": "medium",
                "timeline": "within_sprint"
            })
        
        return recommendations

    async def _generate_process_recommendations(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate process improvement recommendations."""
        recommendations = []
        
        team_size = context["team_size"]
        issues_count = context["issues_count"]
        avg_points = context["avg_points_per_member"]
        
        # Task granularity recommendation
        if issues_count < team_size * 2:
            recommendations.append({
                "id": "task_granularity",
                "category": "process_improvement",
                "priority": "low",
                "priority_score": 40,
                "confidence": 0.70,
                "title": "任务粒度优化建议",
                "description": f"当前任务数量 ({issues_count}) 相对团队规模较少，建议细化任务。",
                "impact": "low",
                "actionable_steps": [
                    "将大任务拆分为更小的可管理单元",
                    "确保每个任务可在1-2天内完成",
                    "提高任务的可见性和跟踪精度"
                ],
                "expected_outcome": "提高任务跟踪精度和团队协作效率",
                "effort_required": "low",
                "timeline": "next_sprint"
            })
        
        # Workload distribution recommendation
        if avg_points > 15:
            recommendations.append({
                "id": "workload_distribution",
                "category": "process_improvement",
                "priority": "medium",
                "priority_score": 55,
                "confidence": 0.75,
                "title": "工作负载分配优化",
                "description": f"平均每人承担 {avg_points:.1f} 故事点，建议优化分配策略。",
                "impact": "medium",
                "actionable_steps": [
                    "实施更细致的任务分配策略",
                    "考虑团队成员的技能匹配度",
                    "建立任务分配的标准流程"
                ],
                "expected_outcome": "提高任务分配效率和质量",
                "effort_required": "medium",
                "timeline": "next_sprint"
            })
        
        return recommendations

    def _calculate_workload_variance(self, issues: List[Dict[str, Any]], team_members: List[Dict[str, Any]]) -> float:
        """Calculate workload variance across team members."""
        if not team_members:
            return 0.0
        
        # Group issues by assignee
        workloads = {}
        for member in team_members:
            workloads[member["id"]] = 0
        
        for issue in issues:
            assignee = issue.get("assignee", {})
            assignee_id = assignee.get("id", "unassigned")
            story_points = issue.get("storyPoints", issue.get("story_points", 0))
            
            if assignee_id in workloads:
                workloads[assignee_id] += story_points
        
        # Calculate variance
        workload_values = list(workloads.values())
        if not workload_values:
            return 0.0
        
        mean_workload = sum(workload_values) / len(workload_values)
        variance = sum((x - mean_workload) ** 2 for x in workload_values) / len(workload_values)
        
        # Normalize variance (0-1 scale)
        return min(variance / (mean_workload + 1), 1.0)

    def _analyze_velocity_trend(self, velocity_data: List[float]) -> str:
        """Analyze velocity trend from historical data."""
        if len(velocity_data) < 3:
            return "insufficient_data"
        
        recent_velocities = velocity_data[-3:]
        if len(recent_velocities) < 3:
            return "insufficient_data"
        
        # Simple trend analysis
        if recent_velocities[-1] > recent_velocities[-2] > recent_velocities[-3]:
            return "improving"
        elif recent_velocities[-1] < recent_velocities[-2] < recent_velocities[-3]:
            return "declining"
        else:
            return "stable"

    def _detect_bottlenecks(self, issues: List[Dict[str, Any]], team_members: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect potential bottlenecks in the sprint."""
        bottlenecks = []
        
        # Analyze issue types distribution
        issue_types = {}
        for issue in issues:
            issue_type = issue.get("issueType", {}).get("name", "Unknown")
            issue_types[issue_type] = issue_types.get(issue_type, 0) + 1
        
        # Check for concentration in specific issue types
        total_issues = len(issues)
        for issue_type, count in issue_types.items():
            if count / total_issues > 0.6:  # More than 60% of issues are same type
                bottlenecks.append({
                    "type": issue_type.lower().replace(" ", "_"),
                    "description": f"{issue_type} 任务集中度过高",
                    "severity": "medium"
                })
        
        # Check for unassigned issues
        unassigned_count = sum(1 for issue in issues if not issue.get("assignee"))
        if unassigned_count > total_issues * 0.2:  # More than 20% unassigned
            bottlenecks.append({
                "type": "unassigned_tasks",
                "description": "未分配任务过多",
                "severity": "high"
            })
        
        return bottlenecks

    def _calculate_sprint_health_score(
        self,
        utilization_rate: float,
        workload_variance: float,
        holiday_impact: float
    ) -> float:
        """Calculate overall sprint health score (0-1)."""
        
        # Optimal utilization is around 80-100%
        utilization_score = 1.0
        if utilization_rate < 70:
            utilization_score = utilization_rate / 70
        elif utilization_rate > 120:
            utilization_score = max(0.3, 1.0 - (utilization_rate - 120) / 100)
        
        # Lower workload variance is better
        variance_score = max(0.0, 1.0 - workload_variance)
        
        # Lower holiday impact is better
        holiday_score = max(0.0, 1.0 - holiday_impact / 100)
        
        # Weighted average
        health_score = (
            utilization_score * 0.4 +
            variance_score * 0.3 +
            holiday_score * 0.3
        )
        
        return max(0.0, min(1.0, health_score))


# Global AI Recommendations service instance
ai_recommendations_service = AIRecommendationsService()
