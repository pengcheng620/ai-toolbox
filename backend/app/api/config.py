"""
API endpoint to provide public, non-sensitive configuration to the frontend.
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.utils.config_loader import get_config, ConfigLoader

router = APIRouter()

def get_public_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filters the full configuration dictionary to return only the parts
    that are safe to be exposed to the public frontend.
    """
    public_config = {}
    
    # Example: Expose feature flags, but not the entire 'services' block
    if 'features' in config:
        public_config['features'] = config['features']
        
    # Example: Expose app name or other UI-related settings
    if 'app_meta' in config:
        public_config['app_meta'] = config['app_meta']

    # Add other safe-to-expose config sections here

    return public_config


@router.get("/config/public", response_model=Dict[str, Any])
async def read_public_config(config_loader: ConfigLoader = Depends(get_config)):
    """
    Returns a dictionary of public, non-sensitive configuration values
    that can be used by the frontend application.
    """
    full_config = config_loader.config
    return get_public_config(full_config)
