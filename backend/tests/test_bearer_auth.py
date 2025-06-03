#!/usr/bin/env python3
"""Test Bearer token authentication with Azure OpenAI."""

import asyncio
import sys
from app.config import settings
from app.services.azure_oauth import oauth_service

async def test_bearer_auth():
    """Test Bearer token authentication."""
    print("=== Bearer Token Authentication Test ===")
    print(f"Azure OpenAI Endpoint: {settings.azure_openai_endpoint}")
    print(f"Resource Name: cog-sandbox-dev-westus3-001")
    print()
    
    # Step 1: Get OAuth token
    try:
        print("1. Getting OAuth token...")
        token = await oauth_service.get_token()
        print(f"✅ Token obtained: {token[:20]}...")
    except Exception as e:
        print(f"❌ OAuth token failed: {e}")
        print("\nPlease run: python update_secret.py")
        print("to update your client secret first.")
        return False
    
    # Step 2: Test Azure OpenAI with Bearer token
    try:
        print("\n2. Testing Azure OpenAI with Bearer token...")
        from openai import AsyncAzureOpenAI
        
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
            default_headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        # Test with a simple completion
        response = await client.chat.completions.create(
            model=settings.azure_openai_deployment_name,
            messages=[
                {"role": "user", "content": "Say 'Hello from Azure OpenAI!'"}
            ],
            max_tokens=20,
            temperature=0.1
        )
        
        print(f"✅ Azure OpenAI response: {response.choices[0].message.content}")
        print(f"Model used: {response.model}")
        return True
        
    except Exception as e:
        print(f"❌ Azure OpenAI test failed: {e}")
        return False

async def test_chat_service():
    """Test the chat service."""
    try:
        print("\n3. Testing chat service...")
        from app.services.chat_service import chat_service
        
        result = await chat_service.generate_simple_chat(
            message="Hello, how are you?",
            max_tokens=30,
            temperature=0.1
        )
        
        if result["success"]:
            print(f"✅ Chat service working!")
            print(f"Response: {result['text']}")
            return True
        else:
            print(f"❌ Chat service failed: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Chat service exception: {e}")
        return False

if __name__ == "__main__":
    print("Testing Bearer Token Authentication")
    print("=" * 40)
    
    # Test OAuth and Azure OpenAI
    auth_success = asyncio.run(test_bearer_auth())
    
    if auth_success:
        # Test chat service
        chat_success = asyncio.run(test_chat_service())
        
        if chat_success:
            print("\n🎉 All tests passed!")
            print("Your API should now work with Bearer token authentication.")
            print("\nTry your curl command now:")
            print("curl -X 'POST' 'http://localhost:8000/api/v1/ai/chat/simple' \\")
            print("  -H 'accept: application/json' \\")
            print("  -H 'Content-Type: application/json' \\")
            print("  -d '{\"message\": \"hi\", \"max_tokens\": 100}'")
        else:
            print("\n❌ Chat service test failed")
    else:
        print("\n❌ Authentication test failed")
    
    sys.exit(0 if auth_success else 1) 