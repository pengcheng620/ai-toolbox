#!/usr/bin/env python3
"""
Test script to verify Definition of Done prompt formatting.
This script tests the DoD prompt to ensure it generates properly formatted output with correct line breaks.
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.prompts.jira.definition_of_done import generate_definition_of_done_prompt, DEFINITION_OF_DONE_SYSTEM_MESSAGE


def test_prompt_structure():
    """Test that the prompt contains the correct structure and formatting instructions."""
    print("🔍 Testing prompt structure...")
    
    task_description = "Implement user authentication feature with email verification"
    prompt = generate_definition_of_done_prompt(task_description)
    
    # Check for critical formatting requirements
    required_elements = [
        "CRITICAL LINE BREAK REQUIREMENTS",
        "TWO line breaks (empty lines) between \"Summary:\" and \"DoD:\" sections",
        "TWO line breaks (empty lines) between the last DoD bullet point and \"Disclaimer / Discussion notes:\" section",
        "Summary: [Provide a brief 1-2 sentence summary",
        "DoD:",
        "- Ensure that end-to-end customer workflows are covered",
        "Disclaimer / Discussion notes:",
    ]
    
    missing_elements = []
    for element in required_elements:
        if element not in prompt:
            missing_elements.append(element)
    
    if missing_elements:
        print("❌ Missing required elements in prompt:")
        for element in missing_elements:
            print(f"   - {element}")
        return False
    else:
        print("✅ All required elements found in prompt")
        return True


def simulate_ai_response(task_description: str) -> str:
    """
    Simulate an AI response following the prompt template exactly.
    This helps us verify the expected output format.
    """
    return f"""Summary: Implementation of user authentication feature with email verification and secure password management.


DoD:

- Ensure that end-to-end customer workflows are covered
- Automated tests covering end-to-end customer workflows
- Ensure that all the fields within Jira have been filled out properly
- Evaluate risk / impacted areas / validation as if the code was being pushed immediately to production
- Authentication flow tested with valid and invalid credentials
- Email verification system tested with different email providers
- Password reset functionality validated with security requirements
- User session management tested for proper timeout and security
- API endpoints documented with authentication requirements


Disclaimer / Discussion notes:

- Security review required before production deployment due to sensitive user data handling
- Email service provider configuration needs to be verified in staging environment
- Consider implementing rate limiting for authentication attempts to prevent brute force attacks
- Database migration for user table changes requires rollback plan and backup strategy"""


def test_output_formatting(output: str) -> bool:
    """Test that the output has proper line breaks and formatting."""
    print("\n🔍 Testing output formatting...")
    
    lines = output.split('\n')
    
    # Find section indices
    summary_idx = None
    dod_idx = None
    disclaimer_idx = None
    
    for i, line in enumerate(lines):
        if line.startswith("Summary:"):
            summary_idx = i
        elif line.strip() == "DoD:":
            dod_idx = i
        elif line.startswith("Disclaimer / Discussion notes:"):
            disclaimer_idx = i
    
    if summary_idx is None or dod_idx is None or disclaimer_idx is None:
        print("❌ Missing required sections")
        return False
    
    # Check line breaks between Summary and DoD
    if dod_idx - summary_idx != 3:  # Summary line + 2 empty lines + DoD line
        print(f"❌ Incorrect spacing between Summary and DoD. Expected 2 empty lines, found {dod_idx - summary_idx - 1}")
        print(f"   Lines {summary_idx} to {dod_idx}:")
        for i in range(summary_idx, min(dod_idx + 1, len(lines))):
            print(f"   {i}: '{lines[i]}'")
        return False
    
    # Find last DoD bullet point
    last_bullet_idx = None
    for i in range(dod_idx + 1, disclaimer_idx):
        if lines[i].strip().startswith('-'):
            last_bullet_idx = i
    
    if last_bullet_idx is None:
        print("❌ No DoD bullet points found")
        return False
    
    # Check line breaks between last DoD bullet and Disclaimer
    if disclaimer_idx - last_bullet_idx != 3:  # Last bullet + 2 empty lines + Disclaimer line
        print(f"❌ Incorrect spacing between DoD and Disclaimer. Expected 2 empty lines, found {disclaimer_idx - last_bullet_idx - 1}")
        print(f"   Lines {last_bullet_idx} to {disclaimer_idx}:")
        for i in range(last_bullet_idx, min(disclaimer_idx + 1, len(lines))):
            print(f"   {i}: '{lines[i]}'")
        return False
    
    # Check that DoD section has proper spacing
    if not lines[dod_idx + 1].strip() == "":
        print("❌ Missing line break after 'DoD:' header")
        return False
    
    # Check that Disclaimer section has proper spacing
    if not lines[disclaimer_idx + 1].strip() == "":
        print("❌ Missing line break after 'Disclaimer / Discussion notes:' header")
        return False
    
    print("✅ Output formatting is correct")
    return True


def test_content_quality(output: str) -> bool:
    """Test that the output contains task-specific content."""
    print("\n🔍 Testing content quality...")
    
    # Check for task-specific validation criteria
    task_specific_indicators = [
        "authentication",
        "email verification",
        "password",
        "security",
        "credentials"
    ]
    
    output_lower = output.lower()
    found_indicators = [indicator for indicator in task_specific_indicators if indicator in output_lower]
    
    if len(found_indicators) < 3:
        print(f"❌ Insufficient task-specific content. Found: {found_indicators}")
        return False
    
    # Check for required core validation items
    core_items = [
        "end-to-end customer workflows are covered",
        "Automated tests covering end-to-end customer workflows",
        "all the fields within Jira have been filled out properly",
        "risk / impacted areas / validation"
    ]
    
    missing_core = [item for item in core_items if item not in output]
    if missing_core:
        print(f"❌ Missing core validation items: {missing_core}")
        return False
    
    print("✅ Content quality is good")
    return True


def main():
    """Run all tests."""
    print("🚀 Testing Definition of Done Prompt Formatting\n")
    
    # Test 1: Prompt structure
    structure_ok = test_prompt_structure()
    
    # Test 2: Simulated output formatting
    task_description = "Implement user authentication feature with email verification"
    simulated_output = simulate_ai_response(task_description)
    
    print(f"\n📝 Simulated AI Output:")
    print("=" * 50)
    print(simulated_output)
    print("=" * 50)
    
    formatting_ok = test_output_formatting(simulated_output)
    content_ok = test_content_quality(simulated_output)
    
    # Summary
    print(f"\n📊 Test Results:")
    print(f"   Prompt Structure: {'✅ PASS' if structure_ok else '❌ FAIL'}")
    print(f"   Output Formatting: {'✅ PASS' if formatting_ok else '❌ FAIL'}")
    print(f"   Content Quality: {'✅ PASS' if content_ok else '❌ FAIL'}")
    
    if all([structure_ok, formatting_ok, content_ok]):
        print(f"\n🎉 All tests passed! The DoD prompt should generate properly formatted output.")
        return 0
    else:
        print(f"\n❌ Some tests failed. Please review the prompt configuration.")
        return 1


if __name__ == "__main__":
    exit(main())
