#!/usr/bin/env python3
"""
Final test script to verify interactive elements preservation and no additional sections.
"""

import asyncio
import aiohttp
import json

async def test_final_preservation():
    """Test final preservation requirements."""
    
    # Test data with simple dash lists (the problematic case)
    test_data = {
        "jira_ticket_id": "TEST-70062",
        "pr_title": "TEST-70062 Remove PDFTron from code",
        "code_changes": "Code changes detected in this Pull Request. Please review the diff for details.",
        "branch_name": "feature/TEST-70062-remove-pdftron",
        "commit_messages": ["Initial commit to remove PDFTron dependencies", "Update imports and references"],
        "description_template": """## Jira ticket

https://jira.autodesk.com/browse/TEST-70062

## Types of changes

- Story/UX Story/Sub-task
- Bug/Story Bug
- Spike

## Description, context

This is a draft PR to remove PDFTron from code.

### Background

We have planned to replace PDFTron with LMV. Please see PDFTron Replacement epic for more details. Now LMV is ready. So we need to remove all code related to PDFTron from our code base.

## Screenshots, videos

## Checklist

- My code follows the code style of this project.
- I have added tests to cover my changes.""",
        "stream": True
    }
    
    print("🧪 FINAL Testing - Interactive Elements & No Additional Sections")
    print("=" * 80)
    
    print("\n📝 Input Template:")
    print("-" * 50)
    print(test_data["description_template"])
    
    # Define critical requirements
    critical_requirements = {
        "simple_dash_preservation": [
            "- Story/UX Story/Sub-task",
            "- Bug/Story Bug", 
            "- Spike"
        ],
        "forbidden_conversions": [
            "- [ ] Story/UX Story/Sub-task",
            "- [x] Story/UX Story/Sub-task",
            "- [ ] Bug/Story Bug",
            "- [x] Bug/Story Bug",
            "- [ ] Spike",
            "- [x] Spike"
        ],
        "forbidden_sections": [
            "## Additional Notes",
            "## Additional Details", 
            "## Summary",
            "## Commit History",
            "## Code Changes",
            "Additional Details:",
            "Additional Notes:"
        ],
        "required_sections": [
            "## Jira ticket",
            "## Types of changes",
            "## Description, context",
            "### Background",
            "## Screenshots, videos",
            "## Checklist"
        ]
    }
    
    print("\n🎯 Critical Requirements:")
    print("-" * 50)
    print("✅ MUST preserve simple dash lists exactly")
    print("❌ MUST NOT convert to checkbox format")
    print("❌ MUST NOT add additional sections")
    print("✅ MUST preserve all existing sections")
    
    # Test streaming mode
    print("\n🌊 Testing Streaming API...")
    print("-" * 50)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8000/api/v1/ai/github/pr-from-jira",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    streaming_result = ""
                    chunk_count = 0
                    
                    print("📡 Receiving streaming data...")
                    
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data = line_str[6:]
                            if data == '[DONE]':
                                break
                            decoded_data = data.replace('\\n', '\n')
                            streaming_result += decoded_data
                            chunk_count += 1
                    
                    print(f"✅ Streaming successful! ({chunk_count} chunks)")
                    
                    print("\n📄 Generated Result:")
                    print("-" * 50)
                    print(streaming_result)
                    
                    # Critical verification
                    print("\n🔍 CRITICAL VERIFICATION:")
                    print("-" * 50)
                    
                    # Test 1: Simple dash preservation
                    print("\n1. SIMPLE DASH LIST PRESERVATION:")
                    all_preserved = True
                    for pattern in critical_requirements["simple_dash_preservation"]:
                        if pattern in streaming_result:
                            print(f"✅ PRESERVED: '{pattern}'")
                        else:
                            print(f"❌ MISSING: '{pattern}'")
                            all_preserved = False
                    
                    # Test 2: No forbidden conversions
                    print("\n2. NO FORBIDDEN CONVERSIONS:")
                    no_conversions = True
                    for pattern in critical_requirements["forbidden_conversions"]:
                        if pattern in streaming_result:
                            print(f"❌ FORBIDDEN CONVERSION FOUND: '{pattern}'")
                            no_conversions = False
                    
                    if no_conversions:
                        print("✅ No forbidden conversions detected")
                    
                    # Test 3: No additional sections
                    print("\n3. NO ADDITIONAL SECTIONS:")
                    no_additional = True
                    for section in critical_requirements["forbidden_sections"]:
                        if section in streaming_result:
                            print(f"❌ FORBIDDEN SECTION FOUND: '{section}'")
                            no_additional = False
                    
                    if no_additional:
                        print("✅ No forbidden additional sections detected")
                    
                    # Test 4: Required sections present
                    print("\n4. REQUIRED SECTIONS PRESENT:")
                    all_required = True
                    for section in critical_requirements["required_sections"]:
                        if section in streaming_result:
                            print(f"✅ PRESENT: '{section}'")
                        else:
                            print(f"❌ MISSING: '{section}'")
                            all_required = False
                    
                    # Final assessment
                    print("\n📊 FINAL ASSESSMENT:")
                    print("-" * 50)
                    
                    if all_preserved and no_conversions and no_additional and all_required:
                        print("🎉 PERFECT! All requirements met:")
                        print("  ✅ Simple dash lists preserved")
                        print("  ✅ No forbidden conversions")
                        print("  ✅ No additional sections")
                        print("  ✅ All required sections present")
                    else:
                        print("❌ FAILED! Issues found:")
                        if not all_preserved:
                            print("  ❌ Simple dash lists not preserved")
                        if not no_conversions:
                            print("  ❌ Forbidden conversions detected")
                        if not no_additional:
                            print("  ❌ Additional sections added")
                        if not all_required:
                            print("  ❌ Required sections missing")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ API call failed with status {response.status}")
                    print(f"Error: {error_text}")
                    
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
    
    print("\n" + "=" * 80)
    print("🏁 Final test completed!")

if __name__ == "__main__":
    asyncio.run(test_final_preservation())
