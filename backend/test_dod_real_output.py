#!/usr/bin/env python3
"""
Real test script to verify Definition of Done output from the actual AI service.
This script calls the actual JiraService to test real AI-generated output.
"""

import asyncio
import sys
import os
import json

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.jira_service import JiraService


def analyze_line_breaks(output: str) -> dict:
    """Analyze the line break structure of the output."""
    lines = output.split('\n')
    analysis = {
        'total_lines': len(lines),
        'empty_lines': [],
        'section_headers': [],
        'line_details': []
    }
    
    for i, line in enumerate(lines):
        line_info = {
            'index': i,
            'content': repr(line),
            'is_empty': line.strip() == '',
            'is_section_header': False
        }
        
        if line.strip() == '':
            analysis['empty_lines'].append(i)
        
        if line.startswith('Summary:') or line.strip() == 'DoD:' or line.startswith('Disclaimer / Discussion notes:'):
            analysis['section_headers'].append({'index': i, 'header': line.strip()})
            line_info['is_section_header'] = True
        
        analysis['line_details'].append(line_info)
    
    return analysis


def check_formatting_compliance(output: str) -> dict:
    """Check if the output complies with the expected formatting."""
    lines = output.split('\n')
    issues = []
    
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
    
    # Check if all sections exist
    if summary_idx is None:
        issues.append("Missing 'Summary:' section")
    if dod_idx is None:
        issues.append("Missing 'DoD:' section")
    if disclaimer_idx is None:
        issues.append("Missing 'Disclaimer / Discussion notes:' section")
    
    if summary_idx is not None and dod_idx is not None:
        # Check spacing between Summary and DoD
        expected_spacing = 3  # Summary line + 2 empty lines + DoD line
        actual_spacing = dod_idx - summary_idx
        if actual_spacing != expected_spacing:
            issues.append(f"Incorrect spacing between Summary and DoD: expected {expected_spacing-1} empty lines, found {actual_spacing-1}")
    
    if dod_idx is not None and disclaimer_idx is not None:
        # Find last DoD bullet point
        last_bullet_idx = None
        for i in range(dod_idx + 1, disclaimer_idx):
            if lines[i].strip().startswith('-'):
                last_bullet_idx = i
        
        if last_bullet_idx is not None:
            expected_spacing = 3  # Last bullet + 2 empty lines + Disclaimer line
            actual_spacing = disclaimer_idx - last_bullet_idx
            if actual_spacing != expected_spacing:
                issues.append(f"Incorrect spacing between DoD and Disclaimer: expected {expected_spacing-1} empty lines, found {actual_spacing-1}")
    
    # Check for proper line break after DoD header
    if dod_idx is not None and dod_idx + 1 < len(lines):
        if lines[dod_idx + 1].strip() != "":
            issues.append("Missing empty line after 'DoD:' header")
    
    # Check for proper line break after Disclaimer header
    if disclaimer_idx is not None and disclaimer_idx + 1 < len(lines):
        if lines[disclaimer_idx + 1].strip() != "":
            issues.append("Missing empty line after 'Disclaimer / Discussion notes:' header")
    
    return {
        'compliant': len(issues) == 0,
        'issues': issues,
        'summary_idx': summary_idx,
        'dod_idx': dod_idx,
        'disclaimer_idx': disclaimer_idx
    }


async def test_real_ai_output():
    """Test the actual AI output from JiraService."""
    print("🤖 Testing real AI output from JiraService...")
    
    try:
        jira_service = JiraService()
        
        test_cases = [
            "Implement user authentication feature with email verification and password reset functionality",
            "Fix critical bug in payment processing system that causes transaction failures",
            "Add responsive design support for mobile devices in the dashboard component",
            "Optimize database queries for user search functionality to improve performance"
        ]
        
        for i, task_description in enumerate(test_cases, 1):
            print(f"\n📝 Test Case {i}: {task_description[:50]}...")
            
            result = await jira_service.generate_dod_summary(task_description)
            
            if not result.get('success'):
                print(f"❌ AI service failed: {result.get('error', 'Unknown error')}")
                continue
            
            output = result.get('generated_content', '')
            if not output:
                print("❌ No content generated")
                continue
            
            print(f"\n📄 Generated Output:")
            print("=" * 60)
            print(output)
            print("=" * 60)
            
            # Analyze line breaks
            analysis = analyze_line_breaks(output)
            print(f"\n🔍 Line Break Analysis:")
            print(f"   Total lines: {analysis['total_lines']}")
            print(f"   Empty lines at indices: {analysis['empty_lines']}")
            print(f"   Section headers: {[h['header'] for h in analysis['section_headers']]}")
            
            # Check formatting compliance
            compliance = check_formatting_compliance(output)
            print(f"\n✅ Formatting Compliance:")
            if compliance['compliant']:
                print("   ✅ All formatting requirements met!")
            else:
                print("   ❌ Formatting issues found:")
                for issue in compliance['issues']:
                    print(f"      - {issue}")
            
            print(f"\n📊 Section Indices:")
            print(f"   Summary: {compliance['summary_idx']}")
            print(f"   DoD: {compliance['dod_idx']}")
            print(f"   Disclaimer: {compliance['disclaimer_idx']}")
            
            # Show detailed line structure for debugging
            if not compliance['compliant']:
                print(f"\n🔍 Detailed Line Structure:")
                for line_info in analysis['line_details'][:20]:  # Show first 20 lines
                    marker = "📍" if line_info['is_section_header'] else "  "
                    empty_marker = "🔳" if line_info['is_empty'] else "  "
                    print(f"   {marker}{empty_marker} {line_info['index']:2d}: {line_info['content']}")
                if len(analysis['line_details']) > 20:
                    print(f"   ... and {len(analysis['line_details']) - 20} more lines")
            
            print("\n" + "="*80)
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing AI output: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run the real AI output test."""
    print("🚀 Testing Real Definition of Done AI Output\n")
    
    success = await test_real_ai_output()
    
    if success:
        print(f"\n🎉 Real AI output test completed. Check the results above for formatting compliance.")
        return 0
    else:
        print(f"\n❌ Real AI output test failed.")
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
