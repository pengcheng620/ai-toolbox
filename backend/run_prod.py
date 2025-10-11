#!/usr/bin/env python3
"""Production server runner script with automatic process cleanup."""

import uvicorn
import os
import sys
import signal
import psutil
from pathlib import Path

# Add project path for config module import
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    from app.utils.config_loader import get_config
    USE_CONFIG_LOADER = True
except ImportError:
    print("[!] Config loader unavailable, using default configuration")
    USE_CONFIG_LOADER = False


def cleanup_old_processes(port: int, pid_file: Path):
    """Clean up old processes before starting new server."""
    print(f"[*] Checking for old processes on port {port}...")
    
    # Check PID file and kill old process
    if pid_file.exists():
        try:
            with open(pid_file, 'r') as f:
                old_pid = int(f.read().strip())
            
            if psutil.pid_exists(old_pid):
                try:
                    old_process = psutil.Process(old_pid)
                    print(f"[*] Found old process (PID: {old_pid}), terminating...")
                    old_process.terminate()
                    old_process.wait(timeout=5)
                    print(f"[*] Old process terminated successfully")
                except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                    print(f"[*] Old process already terminated")
            
            pid_file.unlink()
        except Exception as e:
            print(f"[!] Error cleaning PID file: {e}")
    
    # Check if port is still in use
    connections = psutil.net_connections()
    for conn in connections:
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                occupying_process = psutil.Process(conn.pid)
                print(f"[!] Port {port} occupied by: {occupying_process.name()} (PID: {conn.pid})")
                print(f"[*] Terminating process...")
                occupying_process.terminate()
                occupying_process.wait(timeout=5)
                print(f"[*] Port {port} is now free")
            except psutil.NoSuchProcess:
                print(f"[*] Process on port {port} already terminated")
            except (psutil.AccessDenied, psutil.TimeoutExpired) as e:
                print(f"[!] Could not terminate process: {e}")
                print(f"[!] Please manually kill process and try again")
                sys.exit(1)
            break
    else:
        print(f"[*] Port {port} is available")


def main():
    """Start production server with optimized settings."""
    
    # Ensure logs directory exists
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    print("[*] Starting AI Toolbox Backend in Production Mode")
    print(f"[*] Working directory: {os.getcwd()}")
    print(f"[*] Environment: {os.getenv('ENVIRONMENT', 'production')}")
    
    # Setup PID file
    pid_file = current_dir / ".prod_server.pid"
    
    # Load settings from unified configuration
    if USE_CONFIG_LOADER:
        try:
            config = get_config()
            host = config.get_api_host()
            port = config.get_api_port()
            prod_config = config.get_production_config()
            workers = prod_config.get('workers', 4)
            log_level = prod_config.get('log_level', 'info')
            
            print(f"[*] Using unified configuration file")
            print(f"[*] Host: {host}:{port}")
            print(f"[*] Workers: {workers}")
        except Exception as e:
            print(f"[!] Failed to load configuration: {e}")
            print("[*] Using default configuration")
            host = "0.0.0.0"
            port = 8077
            workers = 4
            log_level = "info"
    else:
        host = "0.0.0.0"
        port = 8077
        workers = 4
        log_level = "info"
        print(f"[*] Using default configuration: {host}:{port}")
    
    # Clean up old processes
    cleanup_old_processes(port, pid_file)
    
    print("=" * 50)
    
    # Write PID file
    try:
        with open(pid_file, 'w') as f:
            f.write(str(os.getpid()))
        print(f"[*] PID file created: {pid_file}")
    except Exception as e:
        print(f"[!] Failed to create PID file: {e}")
    
    # Production environment configuration
    try:
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
    finally:
        # Cleanup PID file when server stops
        if pid_file.exists():
            pid_file.unlink()
            print("[*] PID file cleaned up")

if __name__ == "__main__":
    main()