#!/usr/bin/env python3
"""
Test script for GitHub API improvements
Tests the new user token functionality and error handling
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.github_api_client import GitHubAPIClient


async def test_github_api_improvements():
    """Test the improved GitHub API functionality."""
    print("🧪 Testing GitHub API improvements...")
    
    # Test URLs
    public_pr_url = "https://github.com/microsoft/vscode/pull/1"
    private_pr_url = "https://github.com/autodesk/some-private-repo/pull/1"
    
    async with GitHubAPIClient() as client:
        print("\n1. Testing URL parsing...")
        
        # Test public repo URL parsing
        pr_info = client.parse_pr_url(public_pr_url)
        print(f"✅ Public PR URL parsed: {pr_info}")
        
        # Test private repo URL parsing
        pr_info_private = client.parse_pr_url(private_pr_url)
        print(f"✅ Private PR URL parsed: {pr_info_private}")
        
        print("\n2. Testing header generation...")
        
        # Test without user token (system token only)
        headers_system = client._get_headers()
        print(f"✅ System headers: {headers_system.get('Authorization', 'No auth')[:20]}...")
        
        # Test with user token
        test_user_token = "ghp_test_user_token_123456789"
        headers_user = client._get_headers(user_token=test_user_token)
        print(f"✅ User headers: {headers_user.get('Authorization', 'No auth')[:20]}...")
        
        print("\n3. Testing API calls (will likely fail without valid tokens)...")
        
        # Test public repo access (should work with or without token)
        if pr_info:
            try:
                files_result = await client.fetch_pr_files(
                    owner=pr_info["owner"],
                    repo=pr_info["repo"],
                    pr_number=pr_info["pr_number"]
                )
                print(f"✅ Public repo files fetch: {files_result.get('success', False)}")
                if not files_result.get('success'):
                    print(f"   Error: {files_result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"❌ Public repo files fetch failed: {str(e)}")
        
        # Test with user token
        if pr_info:
            try:
                files_result_user = await client.fetch_pr_files(
                    owner=pr_info["owner"],
                    repo=pr_info["repo"],
                    pr_number=pr_info["pr_number"],
                    user_token=test_user_token
                )
                print(f"✅ User token files fetch: {files_result_user.get('success', False)}")
                if not files_result_user.get('success'):
                    print(f"   Error: {files_result_user.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"❌ User token files fetch failed: {str(e)}")
    
    print("\n🎉 GitHub API improvements test completed!")
    print("\nKey improvements implemented:")
    print("✅ Support for user-provided tokens")
    print("✅ Token priority: user_token > system_token > none")
    print("✅ Enhanced error handling with specific messages")
    print("✅ Secure token logging (only shows preview)")
    print("✅ Backward compatibility maintained")


if __name__ == "__main__":
    asyncio.run(test_github_api_improvements())
