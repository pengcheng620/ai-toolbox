"""
Unified Configuration Loader.

This module provides a robust configuration loading mechanism with a clear priority order:
1.  Default values defined in the code.
2.  Values from `common.yml`.
3.  Values from `deployment.yml` (for environment-specific overrides).
4.  Environment variables (highest priority).

Sensitive information should always be supplied via environment variables.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from functools import lru_cache
import re

def _deep_merge(source: Dict, destination: Dict) -> Dict:
    """
    Recursively merges source dict into destination dict.
    """
    for key, value in source.items():
        if isinstance(value, dict) and key in destination and isinstance(destination[key], dict):
            destination[key] = _deep_merge(value, destination[key])
        else:
            destination[key] = value
    return destination

class ConfigLoader:
    """
    Loads configuration from YAML files and environment variables with a defined priority.
    """
    def __init__(self, config_dir: Optional[Path] = None):
        if config_dir is None:
            current_file = Path(__file__)
            # Assumes this file is at backend/app/utils/config_loader.py
            project_root = current_file.parents[3]
            config_dir = project_root / "config"
        
        self.config_dir = config_dir
        self.common_config_path = self.config_dir / "common.yml"
        self.deployment_config_path = self.config_dir / "deployment.yml"
        self._config: Optional[Dict[str, Any]] = None

    def _get_defaults(self) -> Dict[str, Any]:
        """
        Default configuration values.
        """
        return {
            "services": {
                "backend": {
                    "host": "0.0.0.0",
                    "port": 8077
                }
            },
            "security": {
                "cors_origins": [],
                "allowed_hosts": ["*"]
            }
        }

    def _load_yaml_file(self, path: Path) -> Dict[str, Any]:
        """Loads a single YAML file."""
        if not path.exists():
            return {}
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            raise ValueError(f"Configuration file format error in {path}: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to load configuration file {path}: {e}")

    def _load_from_env(self, config: Dict[str, Any]):
        """
        Overrides configuration with values from environment variables.
        Env var format: AITOOLBOX_SERVICES_BACKEND_PORT=8077
        """
        prefix = "AITOOLBOX_"
        for env_var, value in os.environ.items():
            if env_var.startswith(prefix):
                keys = env_var[len(prefix):].lower().split('_')
                
                # Attempt to cast value to a more appropriate type
                if value.lower() in ['true', 'false']:
                    value = value.lower() == 'true'
                elif value.isdigit():
                    value = int(value)
                
                current_level = config
                for i, key in enumerate(keys):
                    if i == len(keys) - 1:
                        current_level[key] = value
                    else:
                        current_level = current_level.setdefault(key, {})
        return config

    @lru_cache(maxsize=1)
    def load_config(self) -> Dict[str, Any]:
        """
        Loads all configurations according to the priority.
        """
        config = self._get_defaults()
        
        common_config = self._load_yaml_file(self.common_config_path)
        config = _deep_merge(common_config, config)
        
        deployment_config = self._load_yaml_file(self.deployment_config_path)
        config = _deep_merge(deployment_config, config)
        
        config = self._load_from_env(config)

        # Reference resolution should be done last
        return self._resolve_references(config)

    def _resolve_references(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolves variable references in the format ${path.to.key}.
        """
        config_str = yaml.dump(config)
        
        def replacer(match):
            path = match.group(1)
            keys = path.split('.')
            value = config
            try:
                for key in keys:
                    value = value[key]
                return str(value)
            except (KeyError, TypeError):
                # Return original reference if not found
                return match.group(0)

        resolved_str = re.sub(r'\$\{(.*?)\}', replacer, config_str)
        return yaml.safe_load(resolved_str)

    @property
    def config(self) -> Dict[str, Any]:
        """Get the loaded configuration."""
        if self._config is None:
            self._config = self.load_config()
        return self._config

    def get(self, key_path: str, default: Any = None) -> Any:
        """

        Get configuration value using a dot-separated path.
        e.g., "services.backend.port"
        """
        keys = key_path.split(".")
        current = self.config
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current

# Global configuration instance
_config_loader = ConfigLoader()

def get_config() -> ConfigLoader:
    """Get the global configuration instance."""
    return _config_loader

if __name__ == "__main__":
    # Test configuration loading
    config = get_config()
    print("=== AI Toolbox Configuration Information ===")
    print(f"Loaded config: {config.config}")
    print("\n--- Testing 'get' method ---")
    print(f"Service Host: {config.get('services.backend.host', 'default_host')}")
    print(f"Service Port: {config.get('services.backend.port', 'default_port')}")
    print(f"A non-existent key: {config.get('a.b.c', 'default_value')}")
