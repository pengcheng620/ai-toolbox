#!/usr/bin/env python3
"""Simple OAuth test."""

import asyncio
from app.services.azure_oauth import oauth_service

async def test_oauth():
    """Test OAuth token fetch."""
    try:
        print("Testing OAuth token fetch...")
        token = await oauth_service.get_token()
        print(f"✅ Token obtained: {token[:20]}...")
        print(f"Token length: {len(token)}")
        return True
    except Exception as e:
        print(f"❌ OAuth failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_oauth())
    print(f"OAuth test: {'PASSED' if success else 'FAILED'}") 