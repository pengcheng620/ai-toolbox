#!/usr/bin/env python3
"""
Standalone cleanup script for AI Toolbox Backend.

This script:
1. Kills all processes occupying port 8077
2. Removes PID files
3. Optionally kills all uvicorn/python processes (use with caution)

Usage:
    python cleanup.py              # Clean up port 8077 and PID files
    python cleanup.py --kill-all   # Also kill all uvicorn processes
"""

import sys
import argparse
import psutil
from pathlib import Path


def cleanup_port(port: int):
    """Kill all processes occupying the specified port."""
    print(f"[*] Checking port {port}...")
    killed_any = False
    
    connections = psutil.net_connections()
    for conn in connections:
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                process = psutil.Process(conn.pid)
                print(f"[!] Port {port} is occupied by: {process.name()} (PID: {conn.pid})")
                print(f"[*] Terminating process...")
                process.terminate()
                process.wait(timeout=5)
                print(f"[*] Process terminated successfully")
                killed_any = True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired) as e:
                print(f"[!] Error terminating process: {e}")
    
    if not killed_any:
        print(f"[*] Port {port} is not in use")
    
    return killed_any


def cleanup_pid_files():
    """Remove all PID files."""
    print("[*] Cleaning up PID files...")
    
    current_dir = Path(__file__).parent
    pid_patterns = [".dev_server.pid", ".prod_server.pid"]
    
    removed = False
    for pattern in pid_patterns:
        pid_file = current_dir / pattern
        if pid_file.exists():
            pid_file.unlink()
            print(f"[*] Removed: {pid_file}")
            removed = True
    
    if not removed:
        print("[*] No PID files found")


def kill_all_uvicorn():
    """Kill all uvicorn processes. Use with caution!"""
    print("[*] Looking for uvicorn processes...")
    
    killed = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline') or []
            cmdline_str = ' '.join(cmdline).lower()
            
            if 'uvicorn' in cmdline_str or (proc.info['name'] and 'uvicorn' in proc.info['name'].lower()):
                print(f"[*] Found uvicorn process: PID {proc.info['pid']}")
                proc.terminate()
                proc.wait(timeout=5)
                killed.append(proc.info['pid'])
                print(f"[*] Terminated PID {proc.info['pid']}")
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
            pass
    
    if killed:
        print(f"[*] Terminated {len(killed)} uvicorn process(es)")
    else:
        print("[*] No uvicorn processes found")


def main():
    parser = argparse.ArgumentParser(
        description="Clean up AI Toolbox Backend processes and files"
    )
    parser.add_argument(
        '--kill-all',
        action='store_true',
        help='Kill all uvicorn processes (use with caution!)'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=8077,
        help='Port to clean up (default: 8077)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("[*] AI Toolbox Backend Cleanup Script")
    print("=" * 60)
    
    # Clean up specified port
    cleanup_port(args.port)
    
    # Clean up PID files
    cleanup_pid_files()
    
    # Optionally kill all uvicorn
    if args.kill_all:
        print()
        print("[!] WARNING: Killing all uvicorn processes!")
        response = input("[?] Are you sure? (yes/no): ")
        if response.lower() == 'yes':
            kill_all_uvicorn()
        else:
            print("[*] Skipped killing all uvicorn processes")
    
    print()
    print("[*] Cleanup completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()

