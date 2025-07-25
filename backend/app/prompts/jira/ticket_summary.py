"""Jira Ticket Summary prompt templates."""

TICKET_SUMMARY_SYSTEM_MESSAGE = """You are an experienced project manager specializing in extracting actionable insights from Jira tickets.

Your primary goal is to analyze both ticket descriptions and discussion history to provide a concise, value-driven summary that helps team members quickly understand:
- Current situation and project requirements
- Key decisions made or technical approach defined
- Immediate next actions needed
- Critical blockers or dependencies

Analyze all available information sources - both detailed descriptions and discussion comments. For tickets with rich descriptions but limited discussion, focus on extracting insights from the description content. For tickets with extensive discussion, analyze the conversation evolution. Always provide actionable insights regardless of the information source."""


def generate_ticket_summary_prompt(ticket_data: dict) -> str:
    """Generate a focused ticket summary prompt based on ticket data and comments analysis."""
    
    # Extract basic ticket information
    title = ticket_data.get('title', 'N/A')
    description = ticket_data.get('description', 'N/A')
    status = ticket_data.get('status', 'N/A')
    priority = ticket_data.get('priority', 'N/A')
    assignee = ticket_data.get('assignee', 'Unassigned')
    created = ticket_data.get('created', 'N/A')
    updated = ticket_data.get('updated', 'N/A')
    
    # Extract and format comments
    comments = ticket_data.get('comments', [])
    if comments:
        comments_text = "\n".join([
            f"[{comment.get('created', 'Unknown date')}] {comment.get('author', 'Unknown')}: {comment.get('content', '')}"
            for comment in comments
        ])
    else:
        comments_text = "No comments available."
    
    return f"""
### CONTEXT
Analyze this Jira ticket and its discussion history to extract the most valuable insights for team collaboration and decision-making.

### TICKET OVERVIEW
**Title:** {title}
**Status:** {status} | **Priority:** {priority} | **Assignee:** {assignee}
**Created:** {created} | **Updated:** {updated}

**Original Description:**
{description}

### DISCUSSION HISTORY
{comments_text}

### ANALYSIS INSTRUCTIONS
1. **Analyze All Available Information**: Examine both ticket description and discussion history to extract valuable insights.

2. **For Tickets with Rich Descriptions** (when comments are limited):
   - Extract key requirements and technical specifications from description
   - Identify implementation approach and technical details
   - Determine scope and complexity based on described work
   - Extract specific deliverables and acceptance criteria

3. **For Tickets with Rich Discussion** (when comments are extensive):
   - Focus on latest status updates and progress changes
   - Important decisions made during discussions ("decided to", "agreed that", "will change to")  
   - Blocking issues ("blocked by", "waiting for", "depends on")
   - Solutions discovered ("solution is", "approach is", "resolved by")
   - New requirements or scope changes that emerged from discussions

4. **Extract Actionable Insights**: Always provide meaningful next steps regardless of information source.

### OUTPUT FORMAT
Provide a concise summary using exactly this three-section structure:

**Current Situation**
[2-3 sentences describing the current state based on latest updates from comments. What is happening now? What has changed recently?]

**Key Insights**
[Bullet points covering the most important findings from the discussion:
- Critical decisions made
- Important blockers or dependencies discovered
- Solutions or approaches identified
- Scope changes or new requirements
Only include insights that are genuinely valuable - if no significant insights exist, state "No major new developments in discussions."]

**Next Actions**
[Clear, actionable next steps based on the discussion. Who needs to do what? If no clear actions are identified, state "Next actions need to be clarified."]

### QUALITY GUIDELINES
- Keep total length under 400 words for comprehensive analysis
- Use direct, actionable language
- Extract meaningful insights from available information sources (description and/or comments)
- Focus on actionable next steps and clear requirements
- If limited information is available, be honest about constraints while providing maximum value from what exists
- Highlight technical approach, implementation details, and specific deliverables when available

### FINAL REMINDER
Your value comes from extracting actionable insights from ALL available information sources. For tickets with detailed descriptions, analyze the requirements and technical approach. For tickets with rich discussions, focus on conversation evolution. Always provide practical guidance for moving forward.
"""


TICKET_SUMMARY_PROMPT = {
    "system_message": TICKET_SUMMARY_SYSTEM_MESSAGE,
    "generate_prompt": generate_ticket_summary_prompt,
    "suggestions": [
        "Analyze discussion chronology for key decisions",
        "Identify recent status changes and blockers",
        "Focus on actionable next steps from comments"
    ]
}
