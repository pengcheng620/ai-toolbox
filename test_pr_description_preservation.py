#!/usr/bin/env python3
"""
Test script to verify that PR description generation preserves interactive elements.
"""

import asyncio
import json
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.github_service import github_service

async def test_pr_description_preservation():
    """Test that interactive elements are preserved in PR description generation."""
    
    # Test data from the user's request - using TEST- prefix to bypass Jira API
    test_data = {
        "jira_ticket_id": "TEST-70062",  # Using TEST- prefix to use mock data
        "pr_title": "TEST-70062 Remove PDFTron from code.\n        #3947",
        "code_changes": "Code changes detected in this Pull Request. Please review the diff for details.",
        "branch_name": "feature/TEST-70062-remove-pdftron",
        "commit_messages": ["Initial commit to remove PDFTron dependencies", "Update imports and references"],
        "description_template": "## Jira ticket\n\nhttps://jira.autodesk.com/browse/TEST-70062\n\n## Types of changes\n\n- Story/UX Story/Sub-task\n- Bug/Story Bug\n- Spike\n\n## Description, context\n\nThis is a draft PR to remove PDFTron from code.\n\n### Background\n\nWe have planned to replace PDFTron with LMV. Please see PDFTron Replacement epic for more details. Now LMV is ready. So we need to remove all code related to PDFTron from our code base.\n\n## Screenshots, videos\n\n## Checklist\n\n- My code follows the code style of this project.\n- I have added tests to cover my changes."
    }
    
    print("🧪 Testing PR Description Generation with Interactive Elements Preservation")
    print("=" * 80)
    
    print("\n📝 Input Template:")
    print("-" * 40)
    print(test_data["description_template"])
    
    print("\n🚀 Testing Non-Streaming Mode...")
    print("-" * 40)
    
    try:
        # Test non-streaming mode
        result = await github_service.generate_pr_description_from_jira(
            jira_ticket_id=test_data["jira_ticket_id"],
            pr_title=test_data["pr_title"],
            code_changes=test_data["code_changes"],
            branch_name=test_data["branch_name"],
            commit_messages=test_data["commit_messages"],
            description_template=test_data["description_template"]
        )
        
        if result.get("success"):
            generated_description = result.get("generated_description", "")
            print("✅ Non-streaming generation successful!")
            print(f"📊 Tokens used: {result.get('tokens_used', 0)}")
            print(f"🤖 Model: {result.get('model', 'unknown')}")
            
            print("\n📄 Generated Description:")
            print("-" * 40)
            print(generated_description)
            
            # Check if interactive elements are preserved
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
            print(f"❌ Non-streaming generation failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Non-streaming test failed with exception: {str(e)}")
    
    print("\n🌊 Testing Streaming Mode...")
    print("-" * 40)
    
    try:
        # Test streaming mode
        streaming_result = ""
        chunk_count = 0
        
        async for chunk in github_service.generate_pr_description_from_jira_stream(
            jira_ticket_id=test_data["jira_ticket_id"],
            pr_title=test_data["pr_title"],
            code_changes=test_data["code_changes"],
            branch_name=test_data["branch_name"],
            commit_messages=test_data["commit_messages"],
            description_template=test_data["description_template"]
        ):
            streaming_result += chunk
            chunk_count += 1
        
        print(f"✅ Streaming generation successful! ({chunk_count} chunks)")
        
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
        
    except Exception as e:
        print(f"❌ Streaming test failed with exception: {str(e)}")
    
    print("\n" + "=" * 80)
    print("🏁 Test completed!")

if __name__ == "__main__":
    asyncio.run(test_pr_description_preservation())
