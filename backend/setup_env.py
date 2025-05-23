#!/usr/bin/env python3
"""Setup environment variables for AI Toolbox Backend"""

import os
import shutil

def setup_env():
    """创建 .env 文件并提供配置指导"""
    
    # 检查是否已有 .env 文件
    if os.path.exists('.env'):
        print("⚠️  .env 文件已存在")
        response = input("是否要覆盖？(y/N): ")
        if response.lower() != 'y':
            print("取消设置")
            return
    
    # 从 env.example 复制
    if os.path.exists('env.example'):
        shutil.copy('env.example', '.env')
        print("✅ 已从 env.example 创建 .env 文件")
    else:
        # 手动创建基础 .env 文件
        env_content = """# AI Toolbox Backend Environment Variables

# 应用配置
APP_NAME=AI Toolbox Backend
APP_VERSION=0.1.0
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=ai-toolbox-secret-key-change-in-production-12345
LOG_LEVEL=INFO

# API配置
API_V1_PREFIX=/api/v1
CORS_ORIGINS=["chrome-extension://*", "http://localhost:3000"]

# ⭐ Microsoft OAuth Configuration (推荐使用，更安全)
# 请从您的 lib/ai/azure-auth.ts 中的 process.env 复制对应的值：
MS_OAUTH_CLIENT_ID=your-azure-app-client-id
MS_OAUTH_CLIENT_SECRET=your-azure-app-client-secret
MS_OAUTH_GRANT_TYPE=client_credentials
MS_OAUTH_SCOPE=https://cognitiveservices.azure.com/.default
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token

# Azure OpenAI 配置
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-if-needed
AZURE_OPENAI_API_VERSION=2023-05-15
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# JWT配置
JWT_SECRET_KEY=ai-toolbox-jwt-secret-key-change-in-production-12345
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# 数据库配置 (可选)
DATABASE_URL=postgresql+asyncpg://localhost/ai_toolbox
DATABASE_ECHO=false

# Redis配置 (可选)
REDIS_URL=redis://localhost:6379/0

# 功能开关
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_METRICS=true
"""
        
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ 已创建基础 .env 文件")
    
    print("\n📋 接下来请配置以下重要环境变量：")
    print("\n🔐 从您的 lib/ai/azure-auth.ts 中复制以下值：")
    print("   MS_OAUTH_CLIENT_ID     -> process.env.MS_OAUTH_CLIENT_ID")
    print("   MS_OAUTH_CLIENT_SECRET -> process.env.MS_OAUTH_CLIENT_SECRET") 
    print("   MS_OAUTH_URL          -> process.env.MS_OAUTH_URL")
    print("   MS_OAUTH_SCOPE        -> process.env.MS_OAUTH_SCOPE (如果有)")
    print("\n🚀 Azure OpenAI 配置：")
    print("   AZURE_OPENAI_ENDPOINT  -> 您的Azure OpenAI服务端点")
    print("   AZURE_OPENAI_DEPLOYMENT_NAME -> 部署的模型名称 (例如: gpt-4o)")
    
    print("\n✅ 配置完成后，运行以下命令启动服务：")
    print("   uv run python run_dev.py")

if __name__ == "__main__":
    setup_env() 