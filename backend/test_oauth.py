#!/usr/bin/env python3
"""测试OAuth认证功能的示例脚本"""

import asyncio
import os
from app.services.azure_oauth import oauth_service


async def test_oauth():
    """测试OAuth认证功能"""
    print("🔐 测试Azure OAuth认证...")
    
    # 检查环境变量
    required_vars = [
        'MS_OAUTH_CLIENT_ID',
        'MS_OAUTH_CLIENT_SECRET', 
        'MS_OAUTH_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ 缺少环境变量: {', '.join(missing_vars)}")
        print("请在.env文件中配置OAuth认证信息")
        return
    
    try:
        # 测试获取token
        print("📡 正在获取OAuth token...")
        token = await oauth_service.get_token()
        
        if token:
            print(f"✅ OAuth token获取成功!")
            print(f"Token长度: {len(token)} 字符")
            print(f"Token前缀: {token[:20]}...")
            
            # 测试缓存机制
            print("\n🔄 测试token缓存...")
            cached_token = await oauth_service.get_token()
            
            if token == cached_token:
                print("✅ Token缓存工作正常")
            else:
                print("⚠️ Token缓存可能有问题")
                
        else:
            print("❌ OAuth token获取失败")
            
    except Exception as e:
        print(f"❌ OAuth认证测试失败: {str(e)}")


if __name__ == "__main__":
    # 设置测试环境变量（如果.env文件存在）
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(test_oauth()) 