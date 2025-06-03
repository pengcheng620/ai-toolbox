#!/usr/bin/env python3
"""Development server runner script."""

import uvicorn
import os

if __name__ == "__main__":
    print(f"Current working directory: {os.getcwd()}")
    dotenv_path = os.path.join(os.getcwd(), ".env")
    print(f".env file path: {dotenv_path}")
    print(f".env file exists: {os.path.exists(dotenv_path)}")
    if os.path.exists(dotenv_path):
        print("First few lines of .env (if it exists and is readable):")
        try:
            with open(dotenv_path, "r") as f:
                for i, line in enumerate(f):
                    if i < 15: # Print first 5 lines
                        print(line.strip())
                    else:
                        break
        except Exception as e:
            print(f"Error reading .env: {e}")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    ) 