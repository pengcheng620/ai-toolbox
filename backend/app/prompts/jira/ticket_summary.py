"""Jira Ticket Summary prompt templates."""

TICKET_SUMMARY_SYSTEM_MESSAGE = """You are an experienced project manager and technical analyst. Your main task is to analyze Jira tickets and their associated comments to generate comprehensive, actionable summaries that help team members quickly understand the current state and next steps.

Your analysis should cover:
- Core problem identification and context
- Key decisions made during discussions
- Current status and progress updates
- Action items and next steps
- Risk factors and blockers
- Important technical details and dependencies
- Stakeholder concerns and requirements

Focus on extracting the most valuable information that enables quick decision-making and effective collaboration. Prioritize clarity, actionability, and completeness in your summaries."""


def generate_ticket_summary_prompt(ticket_data: dict) -> str:
    """Generate a comprehensive ticket summary prompt based on ticket data and comments."""
    
    # Extract basic ticket information
    title = ticket_data.get('title', 'N/A')
    description = ticket_data.get('description', 'N/A')
    status = ticket_data.get('status', 'N/A')
    priority = ticket_data.get('priority', 'N/A')
    assignee = ticket_data.get('assignee', 'Unassigned')
    created = ticket_data.get('created', 'N/A')
    updated = ticket_data.get('updated', 'N/A')
    
    # Extract comments
    comments = ticket_data.get('comments', [])
    comments_text = ""
    if comments:
        comments_text = "\n".join([
            f"**{comment.get('author', 'Unknown')}** ({comment.get('created', 'N/A')}):\n{comment.get('content', '')}\n"
            for comment in comments
        ])
    else:
        comments_text = "No comments available."
    
    return f"""
### PERSONA
You are an expert project manager and technical analyst.

### CONTEXT
You are analyzing a Jira ticket and its discussion history to create a comprehensive summary that helps team members quickly understand the current situation and determine next steps.

### TICKET INFORMATION
**Title:** {title}
**Status:** {status}
**Priority:** {priority}
**Assignee:** {assignee}
**Created:** {created}
**Last Updated:** {updated}

**Description:**
{description}

### COMMENTS AND DISCUSSION HISTORY
{comments_text}

### YOUR TASK
Based on the ticket information and comments, generate a comprehensive summary. Adhere strictly to the Markdown format specified below. Do not add any introductory or concluding sentences outside of this format.

### CRITICAL FORMATTING REQUIREMENTS
- Use EXACTLY two newline characters (\\n\\n) between each section
- Use EXACTLY one newline character (\\n) between list items
- Ensure proper spacing for readability
- Do NOT merge sections together

### OUTPUT FORMAT

**Executive Summary**

[A 2-3 sentence overview of the ticket's core purpose, current status, and immediate next steps.]


**Key Problem & Context**

[Describe the main problem or requirement this ticket addresses, including relevant background context.]


**Current Status & Progress**

[Summarize the current state of work, what has been completed, and what remains to be done.]


**Important Decisions Made**

- [Decision 1: Brief description of key decision and rationale]
- [Decision 2: Another important decision from the discussion]
- [Decision 3: Additional decisions if applicable, or remove if not needed]


**Action Items & Next Steps**

- [Action 1: Specific next step with owner if mentioned]
- [Action 2: Another required action]
- [Action 3: Additional actions if applicable, or remove if not needed]


**Risks & Blockers**

- [Risk/Blocker 1: Description and potential impact]
- [Risk/Blocker 2: Another concern if applicable, or state "No significant risks identified"]


**Technical Notes & Dependencies**

[Any important technical details, dependencies, or constraints that team members should be aware of.]


**Stakeholder Impact**

[Brief note on how this affects users, other teams, or business objectives. State "Minimal impact" if not significant.]

### FINAL CHECK
Before providing the output, review it to ensure:
1. Each section is separated by exactly two newlines (\\n\\n)
2. List items are separated by exactly one newline (\\n)
3. The formatting exactly matches the template above
4. No sections are merged together
5. All information is accurate and actionable
"""


TICKET_SUMMARY_PROMPT = {
    "system_message": TICKET_SUMMARY_SYSTEM_MESSAGE,
    "generate_prompt": generate_ticket_summary_prompt,
    "suggestions": ["Review all comments thoroughly", "Identify key decisions and blockers", "Focus on actionable next steps"]
}
