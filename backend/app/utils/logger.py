"""Logging configuration utilities."""

import logging
import sys
from typing import Optional

from app.config import settings


def setup_logging(level: Optional[str] = None) -> None:
    """Setup application logging configuration."""
    log_level = level or settings.log_level

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=settings.log_format,
        stream=sys.stdout,
        force=True,  # Override any existing configuration
    )

    # Set specific loggers
    if settings.is_development:
        # More verbose logging in development
        logging.getLogger("uvicorn").setLevel(logging.INFO)
        logging.getLogger("fastapi").setLevel(logging.DEBUG)
    else:
        # Less verbose logging in production
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)

    # Always quiet down some noisy loggers
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)
