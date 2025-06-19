"""Application configuration management."""

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = Field(default="AI Toolbox Backend", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")
    secret_key: str = Field(default="dev-secret-key-12345", alias="SECRET_KEY")

    # API
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    allowed_hosts: str = Field(
        default="localhost,127.0.0.1", alias="ALLOWED_HOSTS"
    )
    cors_origins: str = Field(
        default="chrome-extension://*,http://localhost:3000,https://jira.autodesk.com",
        alias="CORS_ORIGINS",
    )

    # Azure OpenAI
    azure_openai_endpoint: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    azure_openai_api_version: str = Field(
        default="2023-05-15", alias="AZURE_OPENAI_API_VERSION"
    )
    azure_openai_deployment_name: str = Field(
        default="gpt-4o", alias="AZURE_OPENAI_DEPLOYMENT_NAME"
    )

    # Microsoft OAuth (for Azure token authentication)
    ms_oauth_client_id: str = Field(default="", alias="MS_OAUTH_CLIENT_ID")
    ms_oauth_client_secret: str = Field(default="", alias="MS_OAUTH_CLIENT_SECRET")
    ms_oauth_grant_type: str = Field(
        default="client_credentials", alias="MS_OAUTH_GRANT_TYPE"
    )
    ms_oauth_scope: str = Field(
        default="https://cognitiveservices.azure.com/.default", alias="MS_OAUTH_SCOPE"
    )
    ms_oauth_url: str = Field(default="", alias="MS_OAUTH_URL")
    
    # Authentication method selection
    use_oauth_auth: bool = Field(default=True, alias="USE_OAUTH_AUTH")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://localhost/ai_toolbox", alias="DATABASE_URL"
    )
    database_echo: bool = Field(default=False, alias="DATABASE_ECHO")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # JWT
    jwt_secret_key: str = Field(default="dev-jwt-secret-12345", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(
        default=30, alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        alias="LOG_FORMAT",
    )

    # Feature flags
    enable_caching: bool = Field(default=True, alias="ENABLE_CACHING")
    enable_rate_limiting: bool = Field(default=True, alias="ENABLE_RATE_LIMITING")
    enable_metrics: bool = Field(default=True, alias="ENABLE_METRICS")

    # Jira API Integration
    jira_base_url: str = Field(default="", alias="JIRA_BASE_URL")
    jira_username: str = Field(default="", alias="JIRA_USERNAME")
    jira_api_token: str = Field(default="", alias="JIRA_API_TOKEN")
    jira_enable_api: bool = Field(default=False, alias="JIRA_ENABLE_API")
    jira_api_timeout: int = Field(default=30, alias="JIRA_API_TIMEOUT")
    jira_default_project: str = Field(default="", alias="JIRA_DEFAULT_PROJECT")
    
    # Jira Authentication Method
    jira_auth_method: str = Field(default="basic", alias="JIRA_AUTH_METHOD")  # "basic" or "pat"
    jira_personal_access_token: str = Field(default="", alias="JIRA_PERSONAL_ACCESS_TOKEN")

    # GitHub API Integration
    github_api_token: str = Field(default="", alias="GITHUB_API_TOKEN")
    github_api_timeout: int = Field(default=30, alias="GITHUB_API_TIMEOUT")
    github_enable_api: bool = Field(default=True, alias="GITHUB_ENABLE_API")

    @property
    def allowed_hosts_list(self) -> List[str]:
        """Get allowed hosts as list."""
        if isinstance(self.allowed_hosts, str):
            return [host.strip() for host in self.allowed_hosts.split(',') if host.strip()]
        return []

    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as list."""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
        return []

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() in ("development", "dev", "local")

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() in ("production", "prod")

    @property
    def jira_api_enabled(self) -> bool:
        """Check if Jira API integration is enabled and properly configured."""
        if not self.jira_enable_api or not bool(self.jira_base_url):
            return False
        
        if self.jira_auth_method.lower() == "pat":
            # PAT authentication requires only the Personal Access Token
            return bool(self.jira_personal_access_token)
        else:
            # Basic authentication requires username and API token
            return bool(self.jira_username) and bool(self.jira_api_token)




# Global settings instance
settings = Settings()
