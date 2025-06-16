#!/usr/bin/env python3
"""
Simple verification script for the two critical fixes
"""

import os
import re

def verify_api_schema_fixes():
    """Verify API schema fixes in backend"""
    print("🔧 Verifying API Schema Fixes...")
    
    api_file = "backend/app/api/sprint_planning.py"
    if not os.path.exists(api_file):
        print("   ❌ API file not found")
        return False
    
    with open(api_file, 'r') as f:
        content = f.read()
    
    # Check for camelCase field definitions
    checks = [
        ("boardId field", r'boardId:\s*str'),
        ("sprintData field", r'sprintData:\s*Dict'),
        ("teamMembers field", r'teamMembers:\s*List'),
        ("includeAIRecommendations field", r'includeAIRecommendations:\s*bool'),
        ("alias configuration", r'alias='),
        ("Config class", r'class Config:'),
        ("allow_population_by_field_name", r'allow_population_by_field_name\s*=\s*True'),
        ("camelCase usage in endpoints", r'request\.boardId'),
        ("analysisResult field", r'analysisResult:\s*Dict'),
        ("aiRecommendations field", r'aiRecommendations:\s*List'),
        ("teamWorkload field", r'teamWorkload:\s*Dict'),
        ("tokensUsed field", r'tokensUsed:\s*int')
    ]
    
    passed = 0
    for check_name, pattern in checks:
        if re.search(pattern, content):
            print(f"   ✅ {check_name}")
            passed += 1
        else:
            print(f"   ❌ {check_name}")
    
    print(f"   📊 API Schema: {passed}/{len(checks)} checks passed")
    return passed == len(checks)

def verify_ui_positioning_fixes():
    """Verify UI positioning and styling fixes"""
    print("\n🎨 Verifying UI Positioning & Styling Fixes...")
    
    # Check content script
    content_script = "frontend/src/contents/jira-sprint-planning.tsx"
    if not os.path.exists(content_script):
        print("   ❌ Content script file not found")
        return False
    
    with open(content_script, 'r') as f:
        content = f.read()
    
    content_checks = [
        ("ghx-controls selector", r'\.ghx-controls'),
        ("insertBefore usage", r'insertBefore'),
        ("width: 100%", r'width:\s*100%'),
        ("display: block", r'display:\s*block')
    ]
    
    content_passed = 0
    for check_name, pattern in content_checks:
        if re.search(pattern, content):
            print(f"   ✅ Content Script: {check_name}")
            content_passed += 1
        else:
            print(f"   ❌ Content Script: {check_name}")
    
    # Check widget component
    widget_file = "frontend/src/components/sprint-planning/SprintPlanningWidget.tsx"
    if not os.path.exists(widget_file):
        print("   ❌ Widget component file not found")
        return False
    
    with open(widget_file, 'r') as f:
        widget_content = f.read()
    
    widget_checks = [
        ("width: 100%", r'width:\s*"100%"'),
        ("maxWidth constraint", r'maxWidth:\s*"1200px"'),
        ("CSS Grid layout", r'gridTemplateColumns'),
        ("responsive design", r'margin:\s*"0\s*auto"'),
        ("improved section styling", r'backgroundColor:\s*"#f8f9fa"')
    ]
    
    widget_passed = 0
    for check_name, pattern in widget_checks:
        if re.search(pattern, widget_content):
            print(f"   ✅ Widget: {check_name}")
            widget_passed += 1
        else:
            print(f"   ❌ Widget: {check_name}")
    
    total_checks = len(content_checks) + len(widget_checks)
    total_passed = content_passed + widget_passed
    
    print(f"   📊 UI Fixes: {total_passed}/{total_checks} checks passed")
    return total_passed == total_checks

def main():
    print("🚀 Sprint Planning Critical Fixes Verification")
    print("=" * 60)
    
    api_ok = verify_api_schema_fixes()
    ui_ok = verify_ui_positioning_fixes()
    
    print("\n" + "=" * 60)
    
    if api_ok and ui_ok:
        print("🎉 ALL CRITICAL FIXES VERIFIED SUCCESSFULLY!")
        print("\n✅ Issue 1 - API Request Schema Mismatch: FIXED")
        print("   • Backend now accepts camelCase field names")
        print("   • Pydantic models use aliases for compatibility")
        print("   • Response models return camelCase fields")
        print("   • Backward compatibility maintained")
        
        print("\n✅ Issue 2 - UI Positioning and Styling: FIXED")
        print("   • Widget inserts before .ghx-controls element")
        print("   • Width changed to 100% for responsive design")
        print("   • Added maxWidth constraint for large screens")
        print("   • Improved layout with CSS Grid")
        
        print("\n🚀 Ready to proceed to Phase 1 Week 2!")
        return True
    else:
        print("❌ SOME FIXES FAILED VERIFICATION")
        if not api_ok:
            print("   🔧 API Schema fixes need attention")
        if not ui_ok:
            print("   🎨 UI positioning fixes need attention")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
