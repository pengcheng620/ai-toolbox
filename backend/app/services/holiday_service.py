"""Holiday impact analysis service for Sprint Planning."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio

from app.utils.logger import get_logger

logger = get_logger(__name__)


class HolidayService:
    """Service for analyzing holiday impacts on sprint capacity."""

    def __init__(self):
        """Initialize Holiday service."""
        logger.info("Holiday service initialized")
        
        # Predefined holiday data for common regions
        # In production, this would integrate with external APIs
        self.holiday_data = {
            "CN": {  # China
                "2024": [
                    {"name": "元旦", "start": "2024-01-01", "end": "2024-01-01"},
                    {"name": "春节", "start": "2024-02-10", "end": "2024-02-17"},
                    {"name": "清明节", "start": "2024-04-04", "end": "2024-04-06"},
                    {"name": "劳动节", "start": "2024-05-01", "end": "2024-05-05"},
                    {"name": "端午节", "start": "2024-06-10", "end": "2024-06-10"},
                    {"name": "中秋节", "start": "2024-09-15", "end": "2024-09-17"},
                    {"name": "国庆节", "start": "2024-10-01", "end": "2024-10-07"}
                ]
            },
            "US": {  # United States
                "2024": [
                    {"name": "New Year's Day", "start": "2024-01-01", "end": "2024-01-01"},
                    {"name": "Martin Luther King Jr. Day", "start": "2024-01-15", "end": "2024-01-15"},
                    {"name": "Presidents' Day", "start": "2024-02-19", "end": "2024-02-19"},
                    {"name": "Memorial Day", "start": "2024-05-27", "end": "2024-05-27"},
                    {"name": "Independence Day", "start": "2024-07-04", "end": "2024-07-04"},
                    {"name": "Labor Day", "start": "2024-09-02", "end": "2024-09-02"},
                    {"name": "Columbus Day", "start": "2024-10-14", "end": "2024-10-14"},
                    {"name": "Veterans Day", "start": "2024-11-11", "end": "2024-11-11"},
                    {"name": "Thanksgiving", "start": "2024-11-28", "end": "2024-11-29"},
                    {"name": "Christmas", "start": "2024-12-25", "end": "2024-12-25"}
                ]
            },
            "IN": {  # India
                "2024": [
                    {"name": "Republic Day", "start": "2024-01-26", "end": "2024-01-26"},
                    {"name": "Holi", "start": "2024-03-25", "end": "2024-03-25"},
                    {"name": "Independence Day", "start": "2024-08-15", "end": "2024-08-15"},
                    {"name": "Gandhi Jayanti", "start": "2024-10-02", "end": "2024-10-02"},
                    {"name": "Diwali", "start": "2024-11-01", "end": "2024-11-01"}
                ]
            }
        }

    async def analyze_holiday_impact(
        self,
        sprint_start_date: str,
        sprint_end_date: str,
        team_members: List[Dict[str, Any]],
        regions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Analyze holiday impact on sprint capacity."""
        try:
            logger.info(f"Analyzing holiday impact for sprint {sprint_start_date} to {sprint_end_date}")
            
            if not regions:
                regions = ["CN", "US", "IN"]  # Default regions
            
            # Parse sprint dates
            start_date = datetime.fromisoformat(sprint_start_date.replace('Z', '+00:00')).replace(tzinfo=None)
            end_date = datetime.fromisoformat(sprint_end_date.replace('Z', '+00:00')).replace(tzinfo=None)
            
            # Find holidays within sprint period
            holidays_in_sprint = []
            for region in regions:
                region_holidays = self._get_holidays_in_period(region, start_date, end_date)
                holidays_in_sprint.extend(region_holidays)
            
            # Calculate impact on team members
            impact_analysis = self._calculate_team_impact(holidays_in_sprint, team_members)
            
            # Generate recommendations
            recommendations = self._generate_holiday_recommendations(impact_analysis, team_members)
            
            result = {
                "holidays_in_sprint": holidays_in_sprint,
                "impact_analysis": impact_analysis,
                "recommendations": recommendations,
                "total_capacity_reduction": impact_analysis.get("total_capacity_reduction", 0),
                "affected_members_count": len(impact_analysis.get("affected_members", [])),
                "success": True
            }
            
            logger.info(f"Holiday impact analysis completed: {len(holidays_in_sprint)} holidays found")
            return result
            
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

    def _get_holidays_in_period(
        self,
        region: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get holidays for a region within the specified period."""
        holidays = []
        
        # Get current year holidays
        year = start_date.year
        region_holidays = self.holiday_data.get(region, {}).get(str(year), [])
        
        for holiday in region_holidays:
            holiday_start = datetime.fromisoformat(holiday["start"])
            holiday_end = datetime.fromisoformat(holiday["end"])
            
            # Check if holiday overlaps with sprint period
            if (holiday_start <= end_date and holiday_end >= start_date):
                # Calculate working days affected
                working_days = self._calculate_working_days_overlap(
                    max(holiday_start, start_date),
                    min(holiday_end, end_date)
                )
                
                holidays.append({
                    "region": region,
                    "country": self._get_country_name(region),
                    "holiday_name": holiday["name"],
                    "start_date": holiday["start"],
                    "end_date": holiday["end"],
                    "date_range": self._format_date_range(holiday["start"], holiday["end"]),
                    "working_days_affected": working_days
                })
        
        return holidays

    def _calculate_working_days_overlap(self, start_date: datetime, end_date: datetime) -> int:
        """Calculate number of working days between two dates."""
        working_days = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Skip weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() < 5:
                working_days += 1
            current_date += timedelta(days=1)
        
        return working_days

    def _calculate_team_impact(
        self,
        holidays: List[Dict[str, Any]],
        team_members: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate holiday impact on team capacity."""
        affected_members = []
        total_capacity_reduction = 0
        
        # Group team members by region/timezone (simplified logic)
        member_regions = self._assign_member_regions(team_members)
        
        for holiday in holidays:
            region = holiday["region"]
            working_days_affected = holiday["working_days_affected"]
            
            # Find members affected by this holiday
            members_in_region = member_regions.get(region, [])
            
            for member in members_in_region:
                # Calculate capacity reduction for this member
                # Assuming 10 working days per sprint and proportional reduction
                capacity_reduction = (working_days_affected / 10) * 100
                
                affected_member = {
                    "member_id": member["id"],
                    "member_name": member.get("name", member.get("displayName", "Unknown")),
                    "holiday_name": holiday["holiday_name"],
                    "region": region,
                    "capacity_reduction": min(capacity_reduction, 100),  # Cap at 100%
                    "working_days_lost": working_days_affected
                }
                
                affected_members.append(affected_member)
                total_capacity_reduction += capacity_reduction
        
        # Calculate average capacity reduction
        team_size = len(team_members)
        avg_capacity_reduction = total_capacity_reduction / team_size if team_size > 0 else 0
        
        return {
            "affected_members": affected_members,
            "total_capacity_reduction": round(avg_capacity_reduction, 1),
            "holidays_count": len(holidays),
            "team_size": team_size
        }

    def _assign_member_regions(self, team_members: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Assign team members to regions based on timezone or other indicators."""
        # Simplified logic - in production, this would use actual timezone/location data
        member_regions: Dict[str, List[Dict[str, Any]]] = {"CN": [], "US": [], "IN": []}
        
        for member in team_members:
            # Simple heuristic based on name or timezone
            timezone = member.get("timezone", "")
            name = member.get("name", "").lower()
            
            if "asia/shanghai" in timezone.lower() or any(char in name for char in ["李", "王", "张", "刘"]):
                member_regions["CN"].append(member)
            elif "america/" in timezone.lower() or "us/" in timezone.lower():
                member_regions["US"].append(member)
            elif "asia/kolkata" in timezone.lower() or "asia/mumbai" in timezone.lower():
                member_regions["IN"].append(member)
            else:
                # Default assignment - distribute evenly
                min_region = min(member_regions.keys(), key=lambda k: len(member_regions[k]))
                member_regions[min_region].append(member)
        
        return member_regions

    def _generate_holiday_recommendations(
        self,
        impact_analysis: Dict[str, Any],
        team_members: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on holiday impact."""
        recommendations = []
        
        capacity_reduction = impact_analysis.get("total_capacity_reduction", 0)
        affected_members = impact_analysis.get("affected_members", [])
        
        if capacity_reduction > 20:
            recommendations.append(
                f"🏖️ 假期影响较大 ({capacity_reduction}% 容量减少)，建议减少 Sprint 承诺"
            )
        
        if capacity_reduction > 10:
            recommendations.append(
                f"📅 考虑将非关键任务推迟到下个 Sprint"
            )
        
        if len(affected_members) > len(team_members) / 2:
            recommendations.append(
                f"👥 超过一半团队成员受假期影响，建议重新评估 Sprint 目标"
            )
        
        if capacity_reduction > 30:
            recommendations.append(
                f"⚠️ 容量减少超过30%，强烈建议考虑调整 Sprint 时间或范围"
            )
        
        # Add specific recommendations for affected regions
        regions_affected = set(member["region"] for member in affected_members)
        for region in regions_affected:
            region_members = [m for m in affected_members if m["region"] == region]
            if len(region_members) > 0:
                country_name = self._get_country_name(region)
                recommendations.append(
                    f"🌍 {country_name} 地区 {len(region_members)} 名成员受假期影响"
                )
        
        if not recommendations:
            recommendations.append("✅ 假期对 Sprint 容量影响较小，可按计划进行")
        
        return recommendations

    def _get_country_name(self, region_code: str) -> str:
        """Get country name from region code."""
        country_names = {
            "CN": "中国",
            "US": "美国", 
            "IN": "印度"
        }
        return country_names.get(region_code, region_code)

    def _format_date_range(self, start_date: str, end_date: str) -> str:
        """Format date range for display."""
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        if start.date() == end.date():
            return start.strftime("%m/%d")
        else:
            return f"{start.strftime('%m/%d')}-{end.strftime('%m/%d')}"

    async def get_holidays_for_region(
        self,
        region: str,
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get all holidays for a specific region and year."""
        try:
            if not year:
                year = datetime.now().year
            
            holidays = self.holiday_data.get(region, {}).get(str(year), [])
            
            return {
                "region": region,
                "year": year,
                "holidays": holidays,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Failed to get holidays for region {region}: {str(e)}")
            return {
                "region": region,
                "year": year,
                "holidays": [],
                "success": False,
                "error": str(e)
            }

    async def add_custom_holiday(
        self,
        region: str,
        holiday_name: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Add a custom holiday for a region."""
        try:
            year = datetime.fromisoformat(start_date).year
            
            if region not in self.holiday_data:
                self.holiday_data[region] = {}
            
            if str(year) not in self.holiday_data[region]:
                self.holiday_data[region][str(year)] = []
            
            new_holiday = {
                "name": holiday_name,
                "start": start_date,
                "end": end_date
            }
            
            self.holiday_data[region][str(year)].append(new_holiday)
            
            logger.info(f"Added custom holiday {holiday_name} for region {region}")
            
            return {
                "success": True,
                "message": f"Holiday {holiday_name} added successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to add custom holiday: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Global Holiday service instance
holiday_service = HolidayService()
