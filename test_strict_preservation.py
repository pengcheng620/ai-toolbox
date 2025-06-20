#!/usr/bin/env python3
"""
Strict test script to verify that interactive elements are preserved exactly.
"""

import asyncio
import aiohttp
import json

async def test_strict_preservation():
    """Test strict preservation of interactive elements."""
    
    # Test data with various interactive element patterns
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

## Priority Level

- [ ] Low
- [x] Medium
- [ ] High
- [ ] Critical

## Testing Status

- [x] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Screenshots, videos

## Checklist

- My code follows the code style of this project.
- I have added tests to cover my changes.
- [ ] Documentation updated
- [x] Breaking changes documented""",
        "stream": False
    }
    
    print("🧪 STRICT Testing PR Description API with Interactive Elements Preservation")
    print("=" * 90)
    
    print("\n📝 Input Template:")
    print("-" * 50)
    print(test_data["description_template"])
    
    # Define all interactive patterns that MUST be preserved exactly
    interactive_patterns = {
        "simple_dash_lists": [
            "- Story/UX Story/Sub-task",
            "- Bug/Story Bug", 
            "- Spike"
        ],
        "unchecked_boxes": [
            "- [ ] Low",
            "- [ ] High",
            "- [ ] Critical",
            "- [ ] Integration tests added",
            "- [ ] Manual testing completed",
            "- [ ] Documentation updated"
        ],
        "checked_boxes": [
            "- [x] Medium",
            "- [x] Unit tests added",
            "- [x] Breaking changes documented"
        ],
        "simple_checklist": [
            "- My code follows the code style of this project.",
            "- I have added tests to cover my changes."
        ]
    }
    
    print("\n🎯 Interactive Patterns to Preserve:")
    print("-" * 50)
    for category, patterns in interactive_patterns.items():
        print(f"\n{category.upper()}:")
        for pattern in patterns:
            print(f"  '{pattern}'")
    
    # Focus on streaming mode first (like frontend)
    print("\n🌊 Testing Streaming API (Frontend Simulation)...")
    print("-" * 50)

    test_data["stream"] = True
    
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
                    raw_chunks = []

                    print("📡 Receiving streaming data...")

                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data = line_str[6:]  # Remove 'data: ' prefix
                            raw_chunks.append(data)
                            if data == '[DONE]':
                                break
                            # Decode newlines (like frontend does)
                            decoded_data = data.replace('\\n', '\n')
                            streaming_result += decoded_data
                            chunk_count += 1

                    print(f"✅ Streaming API call successful! ({chunk_count} chunks)")
                    print(f"📦 Raw chunks received: {len(raw_chunks)}")

                    print("\n📄 Final Streaming Result:")
                    print("-" * 50)
                    print(streaming_result)
                    
                    # Strict verification
                    print("\n🔍 STRICT Streaming Verification Results:")
                    print("-" * 50)

                    total_patterns = 0
                    preserved_patterns = 0
                    failed_patterns = []

                    for category, patterns in interactive_patterns.items():
                        print(f"\n{category.upper()} VERIFICATION:")
                        for pattern in patterns:
                            total_patterns += 1
                            if pattern in streaming_result:
                                print(f"✅ PRESERVED: '{pattern}'")
                                preserved_patterns += 1
                            else:
                                print(f"❌ FAILED: '{pattern}' - NOT FOUND OR MODIFIED")
                                failed_patterns.append(pattern)

                                # Look for partial matches to understand what happened
                                if "Story/UX Story/Sub-task" in pattern and "Story/UX Story/Sub-task" in streaming_result:
                                    print(f"   ⚠️  Content found but format may be different")
                                elif "Bug/Story Bug" in pattern and "Bug/Story Bug" in streaming_result:
                                    print(f"   ⚠️  Content found but format may be different")
                                elif "Spike" in pattern and "Spike" in streaming_result:
                                    print(f"   ⚠️  Content found but format may be different")
                    
                    # Final assessment
                    print(f"\n📊 PRESERVATION SCORE: {preserved_patterns}/{total_patterns} ({(preserved_patterns/total_patterns)*100:.1f}%)")
                    
                    if preserved_patterns == total_patterns:
                        print("🎉 PERFECT! All interactive elements preserved exactly!")
                    else:
                        print(f"❌ FAILED! {len(failed_patterns)} patterns were modified:")
                        for pattern in failed_patterns:
                            print(f"   - '{pattern}'")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ API call failed with status {response.status}")
                    print(f"Error: {error_text}")
                    
    except Exception as e:
        print(f"❌ Non-streaming test failed with exception: {str(e)}")
    
    print("\n🔄 Testing Additional Streaming Scenarios...")
    print("-" * 50)

    # Test with different scenarios to ensure robustness
    additional_tests = [
        {
            "name": "Empty commit messages",
            "data": {**test_data, "commit_messages": []}
        },
        {
            "name": "Empty code changes",
            "data": {**test_data, "code_changes": ""}
        },
        {
            "name": "Minimal template",
            "data": {
                **test_data,
                "description_template": "## Types of changes\n\n- Story/UX Story/Sub-task\n- Bug/Story Bug\n- Spike\n\n## Checklist\n\n- [ ] Tests added\n- [x] Code reviewed"
            }
        }
    ]

    for test_case in additional_tests:
        print(f"\n🧪 Testing: {test_case['name']}")
        print("-" * 30)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://localhost:8000/api/v1/ai/github/pr-from-jira",
                    json=test_case["data"],
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        result = ""
                        chunk_count = 0

                        async for line in response.content:
                            line_str = line.decode('utf-8').strip()
                            if line_str.startswith('data: '):
                                data = line_str[6:]
                                if data == '[DONE]':
                                    break
                                decoded_data = data.replace('\\n', '\n')
                                result += decoded_data
                                chunk_count += 1

                        print(f"✅ {test_case['name']} successful! ({chunk_count} chunks)")

                        # Quick verification for key patterns
                        key_patterns = ["- Story/UX Story/Sub-task", "- Bug/Story Bug", "- Spike"]
                        preserved_count = sum(1 for pattern in key_patterns if pattern in result)
                        print(f"📊 Key patterns preserved: {preserved_count}/{len(key_patterns)}")

                        if preserved_count < len(key_patterns):
                            print("⚠️  Some patterns may have been modified!")
                            print("Generated content:")
                            print(result[:500] + "..." if len(result) > 500 else result)
                    else:
                        print(f"❌ {test_case['name']} failed with status {response.status}")

        except Exception as e:
            print(f"❌ {test_case['name']} failed with exception: {str(e)}")
    
    print("\n" + "=" * 90)
    print("🏁 STRICT Test completed!")

if __name__ == "__main__":
    asyncio.run(test_strict_preservation())
