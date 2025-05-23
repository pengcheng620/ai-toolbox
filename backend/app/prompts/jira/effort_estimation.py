"""Jira effort estimation prompt templates."""

from typing import Dict, Any, Optional

EFFORT_ESTIMATION_SYSTEM_MESSAGE = """You are an experienced agile development expert, skilled in task estimation and risk assessment."""

def generate_effort_estimation_prompt(
    task_description: str,
    task_type: str = "development",
    team_velocity: Optional[int] = None,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """Generate effort estimation prompt."""
    import json
    
    velocity_info = f"Team velocity: {team_velocity} story points/iteration" if team_velocity else "No team velocity information"
    
    return f"""
Based on the following information, estimate the task effort:

Task type: {task_type}
Task description: {task_description}
{velocity_info}
Context: {json.dumps(context or {}, ensure_ascii=False, indent=2)}

Please provide:
1. Story point estimation (1, 2, 3, 5, 8, 13)
2. Effort estimation (hours)
3. Complexity analysis
4. Risk assessment
5. Suggested split plan (if task is too large)

Please reply in English, providing reasonable estimation basis.
"""

EFFORT_ESTIMATION_PROMPT = {
    "system_message": EFFORT_ESTIMATION_SYSTEM_MESSAGE,
    "generate_prompt": generate_effort_estimation_prompt,
    "suggestions": [
        "Consider technical debt impact",
        "Evaluate dependencies",
        "Reserve test time",
    ]
} 