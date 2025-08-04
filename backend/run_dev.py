#!/usr/bin/env python3
"""Development server runner script."""

import uvicorn
import os
import sys
from pathlib import Path

# Add project path for config module import
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    from app.utils.config_loader import get_config
    USE_CONFIG_LOADER = True
except ImportError:
    print("⚠️  Config loader unavailable, using default configuration")
    USE_CONFIG_LOADER = False

if __name__ == "__main__":
    print("🚀 Starting AI Toolbox Backend in Development Mode")
    print(f"📁 Current working directory: {os.getcwd()}")
    
    # Load port and host configuration from unified config
    if USE_CONFIG_LOADER:
        try:
            config = get_config()
            host = config.get_api_host()
            port = config.get_api_port()
            print(f"📋 Using unified configuration file")
            print(f"🌐 Host: {host}:{port}")
        except Exception as e:
            print(f"⚠️  Failed to load configuration: {e}")
            print("📋 Using default configuration")
            host = "0.0.0.0"
            port = 8077
    else:
        host = "0.0.0.0"
        port = 8077
        print(f"📋 Using default configuration: {host}:{port}")
    
    # Check environment file
    dotenv_path = os.path.join(os.getcwd(), ".env")
    print(f"🔧 .env file path: {dotenv_path}")
    print(f"🔧 .env file exists: {os.path.exists(dotenv_path)}")
    
    if os.path.exists(dotenv_path):
        print("📄 Environment file preview:")
        try:
            with open(dotenv_path, "r", encoding="utf-8") as f:
                for i, line in enumerate(f):
                    if i < 10:  # Print first 10 lines
                        # Hide sensitive information
                        if any(keyword in line.upper() for keyword in ['SECRET', 'KEY', 'TOKEN', 'PASSWORD']):
                            if '=' in line:
                                key, _ = line.split('=', 1)
                                print(f"{key.strip()}=***")
                            else:
                                print("***")
                        else:
                            print(line.strip())
                    else:
                        break
        except Exception as e:
            print(f"❌ Error reading .env: {e}")

    print("=" * 50)
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )