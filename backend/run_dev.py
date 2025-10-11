#!/usr/bin/env python3
"""Development server runner script with automatic process cleanup."""

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
    
    # Step 1: Check PID file and kill old process
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
                    print(f"[*] Old process already terminated or timed out")
            
            pid_file.unlink()
        except Exception as e:
            print(f"[!] Error reading/cleaning PID file: {e}")
    
    # Step 2: Check if port is still in use and kill occupying process
    connections = psutil.net_connections()
    for conn in connections:
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                occupying_process = psutil.Process(conn.pid)
                print(f"[!] Port {port} is occupied by process: {occupying_process.name()} (PID: {conn.pid})")
                print(f"[*] Terminating occupying process...")
                occupying_process.terminate()
                occupying_process.wait(timeout=5)
                print(f"[*] Port {port} is now free")
            except psutil.NoSuchProcess:
                print(f"[*] Process on port {port} already terminated")
            except (psutil.AccessDenied, psutil.TimeoutExpired) as e:
                print(f"[!] Could not terminate process on port {port}: {e}")
                print(f"[!] Please manually kill process and try again")
                sys.exit(1)
            break
    else:
        print(f"[*] Port {port} is available")


def write_pid_file(pid_file: Path):
    """Write current process PID to file."""
    try:
        with open(pid_file, 'w') as f:
            f.write(str(os.getpid()))
        print(f"[*] PID file created: {pid_file}")
    except Exception as e:
        print(f"[!] Failed to create PID file: {e}")


def cleanup_on_exit(pid_file: Path):
    """Cleanup PID file on exit."""
    def signal_handler(signum, frame):
        print(f"\n[*] Received signal {signum}, cleaning up...")
        if pid_file.exists():
            pid_file.unlink()
            print(f"[*] PID file removed")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


if __name__ == "__main__":
    print("[*] Starting AI Toolbox Backend in Development Mode")
    print(f"[*] Current working directory: {os.getcwd()}")
    
    # Load port and host configuration from unified config
    if USE_CONFIG_LOADER:
        try:
            config = get_config()
            host = config.get_api_host()
            port = config.get_api_port()
            print(f"[*] Using unified configuration file")
            print(f"[*] Host: {host}:{port}")
        except Exception as e:
            print(f"[!] Failed to load configuration: {e}")
            print("[*] Using default configuration")
            host = "0.0.0.0"
            port = 8077
    else:
        host = "0.0.0.0"
        port = 8077
        print(f"[*] Using default configuration: {host}:{port}")
    
    # Setup PID file
    pid_file = current_dir / ".dev_server.pid"
    
    # Clean up old processes
    cleanup_old_processes(port, pid_file)
    
    # Setup cleanup on exit
    cleanup_on_exit(pid_file)
    
    # Check environment file
    dotenv_path = os.path.join(os.getcwd(), ".env")
    print(f"[*] .env file path: {dotenv_path}")
    print(f"[*] .env file exists: {os.path.exists(dotenv_path)}")
    
    if os.path.exists(dotenv_path):
        print("[*] Environment file preview:")
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
            print(f"[!] Error reading .env: {e}")

    print("=" * 50)
    
    # Write PID file after uvicorn starts
    write_pid_file(pid_file)
    
    try:
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=True,
            log_level="info",
        )
    finally:
        # Cleanup PID file when server stops
        if pid_file.exists():
            pid_file.unlink()
            print("[*] PID file cleaned up")