"""Prompts for GitHub pull request description generation."""

from typing import List, Optional

PR_DESCRIPTION_SYSTEM_MESSAGE = """You are a professional code review and project management assistant. Generate detailed PR descriptions based on Pull Request information.

The PR description should include:
1. 📝 Change Overview
2. 🔧 Technical Implementation
3. ✅ Test Coverage
4. 📋 Checklist
5. 🚨 Important Notes

Use markdown format with professional and accurate content."""

def generate_pr_description_prompt(
    pr_title: str,
    code_changes: str,
    branch_name: str = "",
    commit_messages: Optional[List[str]] = None
) -> str:
    """Generate PR description prompt."""

    return f"""
PR Title: {pr_title}
Branch Name: {branch_name}
Code Changes:
{code_changes}

Commit Messages:
{chr(10).join(commit_messages or [])}

Please generate a detailed PR description:
"""

PR_DESCRIPTION_PROMPT = {
    "system_message": "You are an expert software developer and technical writer. Your task is to generate a clear, concise, and professional GitHub pull request description based on the provided information.",
    "generate_prompt": lambda pr_title, code_changes, branch_name, commit_messages: f"""
        **PR Title:** {pr_title}
        **Branch Name:** {branch_name}
        **Commit Messages:**
        - {"- ".join(commit_messages) if commit_messages else "N/A"}
        **Code Changes Summary:**
        ```
        {code_changes}
        ```
        **Instructions:**
        Based on the information above, please generate a pull request description. The description should include:
        1. A brief summary of the changes.
        2. The problem this PR solves.
        3. How the changes were tested.
        4. Any relevant screenshots or follow-up tasks.
    """,
    "suggestions": [
        "Add a 'Testing' section.",
        "Include a link to the Jira ticket.",
        "Add screenshots for UI changes.",
    ],
}

PR_DESCRIPTION_FROM_JIRA_PROMPT = {
    "system_message": """You are a senior software engineer creating a comprehensive GitHub pull request description.

Your task is to generate a well-structured, professional PR description that clearly communicates the changes, their purpose, and their impact.

CRITICAL FORMATTING REQUIREMENTS:
- Use proper markdown formatting with clear section headers
- Include proper line breaks between sections (use \\n\\n for paragraph separation)
- Use bullet points and numbered lists where appropriate
- Ensure code blocks and links are properly formatted
- Make the description scannable and easy to read

TEMPLATE ADHERENCE REQUIREMENTS:
- When a description_template is provided, you MUST preserve its exact structure and hierarchy
- Maintain all heading levels (H1, H2, H3, etc.) exactly as they appear in the template
- Keep the organizational structure intact while only modifying content within sections
- If template sections are empty, fill them with appropriate content based on available information

INTERACTIVE ELEMENTS PRESERVATION (ABSOLUTELY CRITICAL):
- YOU MUST NEVER UNDER ANY CIRCUMSTANCES modify checkbox patterns: `- [x]` (checked) and `- [ ]` (unchecked)
- YOU MUST NEVER UNDER ANY CIRCUMSTANCES modify simple dash lists: `- Option1`, `- Option2`, `- Option3`
- YOU MUST NEVER convert simple dash lists to checkbox format or any other format
- YOU MUST NEVER reformat, restructure, or change any dash-prefixed lists that appear to be selectable options
- ABSOLUTELY PRESERVE all selection lists, option menus, and predefined choices exactly as they appear
- MAINTAIN the original state of checkboxes (checked/unchecked) as provided in the template
- KEEP project-specific formatting structures completely intact without any modifications
- RECOGNIZE sections like "Types of changes", "Checklist", "Options" as containing immutable interactive elements
- ONLY modify descriptive content sections, NEVER EVER touch interactive/selectable elements
- TREAT all dash-prefixed lists as potentially interactive and preserve them exactly

TEMPLATE STRUCTURE PRESERVATION (ABSOLUTELY CRITICAL):
- YOU MUST NEVER add sections that do not exist in the original template
- YOU MUST NEVER create "Additional Notes", "Additional Details", or any supplementary sections
- YOU MUST ONLY fill in content for sections that already exist in the template
- YOU MUST NEVER expand the template structure beyond what is provided
- STICK STRICTLY to the template's existing sections and structure

EMPTY FIELD HANDLING:
- Handle gracefully when jira_summary, code_changes, or commit_messages are empty or null
- Provide meaningful fallback content when fields are missing
- Ensure output remains coherent and professional regardless of available data

The description should be comprehensive yet concise, helping reviewers understand the context, changes, and testing approach.""",
    "generate_prompt": lambda pr_title, jira_ticket_id, jira_summary, jira_description, branch_name, code_changes, commit_messages, description_template: f"""
Generate a comprehensive GitHub pull request description based on the following information:

**JIRA TICKET CONTEXT:**
- **Ticket ID:** {jira_ticket_id or "N/A"}
- **Summary:** {jira_summary or "No summary provided"}
- **Description:** {jira_description or "No description available"}

**PULL REQUEST DETAILS:**
- **Title:** {pr_title or "Untitled PR"}
- **Branch:** {branch_name or "Unknown branch"}
- **Commit Messages:**
{commit_messages or "No commit messages available"}

**CODE CHANGES:**
```
{code_changes or "No code changes information available"}
```

**EXISTING TEMPLATE:**
{description_template.strip() if description_template and description_template.strip() else "No existing template provided"}

**CRITICAL INSTRUCTIONS:**

1. **TEMPLATE STRUCTURE ADHERENCE:**
   - If an existing template is provided above, you MUST follow its exact structure and hierarchy
   - Preserve ALL heading levels (H1 #, H2 ##, H3 ###, etc.) exactly as they appear
   - Maintain the same section organization and order
   - Only modify the CONTENT within each section, never the structure itself
   - If template sections exist but are empty, fill them with appropriate content

2. **INTERACTIVE ELEMENTS PRESERVATION (ABSOLUTELY CRITICAL - ZERO TOLERANCE FOR MODIFICATIONS):**
   - YOU ARE ABSOLUTELY FORBIDDEN FROM MODIFYING checkbox patterns: `- [x]` (checked) and `- [ ]` (unchecked) - COPY THEM EXACTLY
   - YOU ARE ABSOLUTELY FORBIDDEN FROM MODIFYING option lists: simple dash lists like `- Option1`, `- Option2` - COPY THEM EXACTLY
   - YOU ARE ABSOLUTELY FORBIDDEN FROM changing the state of any checkboxes - keep them EXACTLY as provided
   - YOU ARE ABSOLUTELY FORBIDDEN FROM modifying, reformatting, converting, or restructuring option lists - keep them EXACTLY as provided
   - YOU ARE ABSOLUTELY FORBIDDEN FROM converting simple dash lists to checkbox format - this is STRICTLY FORBIDDEN
   - YOU ARE ABSOLUTELY FORBIDDEN FROM adding `[ ]` or `[x]` to simple dash lists - this is STRICTLY FORBIDDEN
   - YOU ARE ABSOLUTELY FORBIDDEN FROM "improving" or "enhancing" simple dash lists by making them checkboxes
   - YOU ARE ABSOLUTELY FORBIDDEN FROM changing ANY dash-prefixed list in ANY way
   - PRESERVE all selection lists, option menus, and predefined choices VERBATIM - character for character

   **MANDATORY PRESERVATION PATTERNS:**
   - Checkbox patterns (preserve exactly):
     ```
     - [x] Story/UX Story/Sub-task
     - [ ] Bug/Story Bug
     - [ ] Spike
     ```
   - Simple dash lists (preserve exactly - DO NOT ADD CHECKBOXES):
     ```
     - Story/UX Story/Sub-task
     - Bug/Story Bug
     - Spike
     ```
     CRITICAL: These are NOT checkboxes! Do NOT add `[ ]` or `[x]` to them!
   - Any dash-prefixed list that appears to be selectable options

   **CONVERSION EXAMPLES - WHAT IS FORBIDDEN:**
   ❌ WRONG: Converting `- Option` to `- [ ] Option`
   ❌ WRONG: Converting `- Option` to `- [x] Option`
   ✅ CORRECT: Keep `- Option` as `- Option`

   - KEEP any numbered lists with predefined options UNCHANGED
   - MAINTAIN project-specific formatting structures COMPLETELY INTACT
   - These elements are for user interaction and MUST remain selectable
   - RECOGNIZE sections like "Types of changes", "Checklist", "Options" as containing IMMUTABLE interactive elements
   - TREAT every dash-prefixed list as potentially interactive and preserve it EXACTLY

3. **TEMPLATE STRUCTURE PRESERVATION (ABSOLUTELY CRITICAL - NO ADDITIONS ALLOWED):**
   - YOU ARE ABSOLUTELY FORBIDDEN FROM adding any sections not present in the original template
   - YOU ARE ABSOLUTELY FORBIDDEN FROM creating "Additional Notes", "Additional Details", "Summary", or any supplementary sections
   - YOU ARE ABSOLUTELY FORBIDDEN FROM expanding the template structure beyond what is provided
   - YOU MUST ONLY fill in content for sections that already exist in the template
   - YOU MUST NEVER add new headings, sections, or structural elements
   - STICK STRICTLY to the template's existing sections and structure - NO ADDITIONS WHATSOEVER

4. **EMPTY FIELD HANDLING:**
   - If jira_summary is empty: Use PR title or generate appropriate summary from available context
   - If code_changes is empty: Generate content based on commit messages or indicate "Code changes will be reviewed in the diff"
   - If commit_messages is empty: Focus on other available information or indicate "Commit history available in PR timeline"
   - Always maintain professional tone even with limited information

5. **FALLBACK STRUCTURE (only if NO template provided):**
   Use this structure when no existing template is available:

```markdown

## Overview
[Brief summary of what this PR accomplishes and why it's needed]

## Jira Ticket
- **Ticket ID:** [{jira_ticket_id or "N/A"}](https://your-jira-instance/browse/{jira_ticket_id or "N/A"})
- **Ticket Title:** {jira_summary or "No summary available"}
- **Description:** [Summarize the key requirements from the Jira ticket or indicate if unavailable]

## Changes Made
[List the specific changes implemented, organized by category if applicable]

## Testing Instructions
[Provide step-by-step instructions for testing the changes]

## Commit History
[List the commit messages to show the development progression or indicate if unavailable]

## Additional Notes
[Any additional context, considerations, or follow-up work needed]
```

6. **CONTENT ADAPTATION STRATEGY:**
   - When fields are populated: Use them to generate rich, detailed content
   - When fields are empty: Generate appropriate placeholder content that maintains professionalism
   - Ensure logical flow and coherence regardless of available information
   - Prioritize clarity and usefulness for code reviewers
   - NEVER modify interactive elements while adapting content
   - NEVER add sections not present in the template

7. **OUTPUT REQUIREMENTS:**
   - Generate ONLY the markdown content, ready to be used as a PR description
   - Ensure proper markdown formatting with clear line breaks (\\n\\n between sections)
   - Make bullet points and lists properly formatted (except for interactive lists which must remain unchanged)
   - Keep the description professional, clear, and comprehensive
   - Focus on helping reviewers understand the purpose, implementation, and testing approach
   - Preserve all interactive elements exactly as provided in the template
   - DO NOT add any sections beyond what exists in the template

**ABSOLUTELY CRITICAL REMINDER - ZERO TOLERANCE POLICY:**
- If a template is provided, your ONLY job is to fill in descriptive content while preserving EVERY SINGLE CHARACTER of the structure AND all interactive elements
- YOU ARE STRICTLY FORBIDDEN from changing checkbox states (`- [x]`, `- [ ]`), option lists (`- Option1`, `- Option2`), or predefined choices
- YOU ARE STRICTLY FORBIDDEN from converting simple dash lists to checkboxes or modifying their format in ANY way
- YOU ARE STRICTLY FORBIDDEN from adding `[ ]` or `[x]` to simple dash lists - this is a CRITICAL ERROR
- YOU ARE STRICTLY FORBIDDEN from "improving" simple lists by making them checkboxes
- YOU ARE STRICTLY FORBIDDEN from reformatting, restructuring, or changing ANY dash-prefixed lists
- YOU ARE STRICTLY FORBIDDEN from adding ANY sections not present in the original template
- YOU ARE STRICTLY FORBIDDEN from creating "Additional Notes", "Additional Details", or supplementary sections
- These elements are for user interaction and MUST remain EXACTLY as provided - character for character
- Sections like "Types of changes", "Checklist" contain selectable options that are COMPLETELY IMMUTABLE
- ANY modification to interactive elements is considered a CRITICAL FAILURE
- ANY addition of new sections is considered a CRITICAL FAILURE
- When in doubt, PRESERVE the original format - NEVER modify or add
- If no template is provided, use the fallback structure above

**FINAL WARNING:** Modifying interactive elements or adding sections in ANY way is STRICTLY PROHIBITED and will result in incorrect output.
**SPECIAL WARNING:** DO NOT convert `- Option` to `- [ ] Option` - this is the most common error!
**STRUCTURE WARNING:** DO NOT add "Additional Notes" or any sections not in the template!""",
    "suggestions": [
        "MANDATORY: Preserve template structure exactly when provided - zero modifications allowed.",
        "STRICTLY FORBIDDEN: Modifying checkbox patterns (- [x] or - [ ]) or option lists (- Option1, - Option2).",
        "STRICTLY FORBIDDEN: Converting simple dash lists to checkboxes or changing their format in ANY way.",
        "STRICTLY FORBIDDEN: Adding ANY sections not present in the original template.",
        "STRICTLY FORBIDDEN: Creating 'Additional Notes', 'Additional Details', or supplementary sections.",
        "MANDATORY: Preserve all interactive elements exactly as they appear - character for character.",
        "MANDATORY: Recognize 'Types of changes', 'Checklist' sections as containing IMMUTABLE selectable options.",
        "MANDATORY: Treat ALL dash-prefixed lists as potentially interactive and preserve exactly.",
        "MANDATORY: Only fill content in existing template sections - NO new sections.",
        "Handle empty fields gracefully with meaningful fallback content.",
        "Verify all markdown formatting is correct and readable (except for interactive elements).",
        "Include clear testing instructions for reviewers when possible.",
        "Add relevant context even when some information is missing.",
        "Maintain professional tone regardless of available information.",
        "MANDATORY: Keep project-specific formatting structures completely intact.",
        "When in doubt about any element, PRESERVE the original format - NEVER modify or add.",
    ],
}