#!/usr/bin/env python3
"""
Test script to verify PR description generation via API endpoint.
"""

import asyncio
import aiohttp
import json

async def test_api_preservation():
    """Test the API endpoint for interactive elements preservation."""
    
    # Test data
    test_data = {
        "jira_ticket_id": "TEST-70062",
        "pr_title": "TEST-70062 Remove PDFTron from code",
        "code_changes": "Code changes detected in this Pull Request. Please review the diff for details.",
        "branch_name": "feature/TEST-70062-remove-pdftron",
        "commit_messages": ["Initial commit to remove PDFTron dependencies", "Update imports and references"],
        "description_template": "## Jira ticket\n\nhttps://jira.autodesk.com/browse/TEST-70062\n\n## Types of changes\n\n- Story/UX Story/Sub-task\n- Bug/Story Bug\n- Spike\n\n## Description, context\n\nThis is a draft PR to remove PDFTron from code.\n\n### Background\n\nWe have planned to replace PDFTron with LMV. Please see PDFTron Replacement epic for more details. Now LMV is ready. So we need to remove all code related to PDFTron from our code base.\n\n## Screenshots, videos\n\n## Checklist\n\n- My code follows the code style of this project.\n- I have added tests to cover my changes.",
        "stream": False
    }
    
    print("🧪 Testing PR Description API with Interactive Elements Preservation")
    print("=" * 80)
    
    print("\n📝 Input Template:")
    print("-" * 40)
    print(test_data["description_template"])
    
    # Test non-streaming mode
    print("\n🚀 Testing Non-Streaming API...")
    print("-" * 40)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8000/api/v1/ai/github/pr-from-jira",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Non-streaming API call successful!")
                    print(f"📊 Tokens used: {result.get('tokens_used', 0)}")
                    print(f"🤖 Model: {result.get('model', 'unknown')}")
                    
                    generated_description = result.get("generated_description", "")
                    print("\n📄 Generated Description:")
                    print("-" * 40)
                    print(generated_description)
                    
                    # Verify preservation
                    print("\n🔍 Verification Results:")
                    print("-" * 40)
                    
                    # Check for "Types of changes" section preservation
                    if "## Types of changes" in generated_description:
                        print("✅ 'Types of changes' section header preserved")
                        
                        # Check if the options are preserved exactly
                        original_options = [
                            "- Story/UX Story/Sub-task",
                            "- Bug/Story Bug", 
                            "- Spike"
                        ]
                        
                        all_preserved = True
                        for option in original_options:
                            if option in generated_description:
                                print(f"✅ Option preserved: '{option}'")
                            else:
                                print(f"❌ Option missing or modified: '{option}'")
                                all_preserved = False
                                # Look for similar patterns
                                if "Story/UX Story/Sub-task" in generated_description:
                                    print(f"   Found similar: Story/UX Story/Sub-task (but format may be different)")
                                if "Bug/Story Bug" in generated_description:
                                    print(f"   Found similar: Bug/Story Bug (but format may be different)")
                                if "Spike" in generated_description:
                                    print(f"   Found similar: Spike (but format may be different)")
                        
                        if all_preserved:
                            print("🎉 All interactive elements preserved correctly!")
                        else:
                            print("⚠️  Some interactive elements were modified")
                    else:
                        print("❌ 'Types of changes' section missing")
                    
                    # Check for checklist preservation
                    if "## Checklist" in generated_description:
                        print("✅ 'Checklist' section preserved")
                        if "- My code follows the code style" in generated_description:
                            print("✅ Checklist items preserved")
                        else:
                            print("❌ Checklist items modified")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ API call failed with status {response.status}")
                    print(f"Error: {error_text}")
                    
    except Exception as e:
        print(f"❌ Non-streaming test failed with exception: {str(e)}")
    
    # Test streaming mode
    print("\n🌊 Testing Streaming API...")
    print("-" * 40)
    
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
                    
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data = line_str[6:]  # Remove 'data: ' prefix
                            if data == '[DONE]':
                                break
                            # Decode newlines
                            decoded_data = data.replace('\\n', '\n')
                            streaming_result += decoded_data
                            chunk_count += 1
                    
                    print(f"✅ Streaming API call successful! ({chunk_count} chunks)")
                    
                    print("\n📄 Streaming Generated Description:")
                    print("-" * 40)
                    print(streaming_result)
                    
                    # Verify streaming result
                    print("\n🔍 Streaming Verification Results:")
                    print("-" * 40)
                    
                    if "## Types of changes" in streaming_result:
                        print("✅ 'Types of changes' section header preserved in streaming")
                        
                        original_options = [
                            "- Story/UX Story/Sub-task",
                            "- Bug/Story Bug", 
                            "- Spike"
                        ]
                        
                        all_preserved = True
                        for option in original_options:
                            if option in streaming_result:
                                print(f"✅ Streaming option preserved: '{option}'")
                            else:
                                print(f"❌ Streaming option missing or modified: '{option}'")
                                all_preserved = False
                        
                        if all_preserved:
                            print("🎉 All interactive elements preserved correctly in streaming!")
                        else:
                            print("⚠️  Some interactive elements were modified in streaming")
                    
                else:
                    error_text = await response.text()
                    print(f"❌ Streaming API call failed with status {response.status}")
                    print(f"Error: {error_text}")
                    
    except Exception as e:
        print(f"❌ Streaming test failed with exception: {str(e)}")
    
    print("\n" + "=" * 80)
    print("🏁 Test completed!")

if __name__ == "__main__":
    asyncio.run(test_api_preservation())
