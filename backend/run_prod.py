#!/usr/bin/env python3
"""Production server runner script."""

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

def main():
    """Start production server with optimized settings."""
    
    # Ensure logs directory exists
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    print("🚀 Starting AI Toolbox Backend in Production Mode")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🔧 Environment: {os.getenv('ENVIRONMENT', 'production')}")
    
    # Load settings from unified configuration
    if USE_CONFIG_LOADER:
        try:
            config = get_config()
            host = config.get_api_host()
            port = config.get_api_port()
            prod_config = config.get_production_config()
            workers = prod_config.get('workers', 4)
            log_level = prod_config.get('log_level', 'info')
            
            print(f"📋 Using unified configuration file")
            print(f"🌐 Host: {host}:{port}")
            print(f"👥 Workers: {workers}")
        except Exception as e:
            print(f"⚠️  Failed to load configuration: {e}")
            print("📋 Using default configuration")
            host = "0.0.0.0"
            port = 8077
            workers = 4
            log_level = "info"
    else:
        host = "0.0.0.0"
        port = 8077
        workers = 4
        log_level = "info"
        print(f"📋 Using default configuration: {host}:{port}")
    
    print("=" * 50)
    
    # Production environment configuration
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=workers,  # Multi-process for better performance
        reload=False,  # Disable hot reload in production
        log_level=log_level,
        access_log=True,
        # Logging configuration
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
                "file": {
                    "formatter": "default",
                    "class": "logging.FileHandler",
                    "filename": "logs/app.log",
                },
            },
            "root": {
                "level": "INFO",
                "handlers": ["console", "file"],
            },
        },
    )

if __name__ == "__main__":
    main()