# OAuth Token Management Troubleshooting

## Problem Analysis

### Issue Description
The AI Toolbox backend was experiencing authentication failures when calling Azure OpenAI APIs through the REST endpoints, despite the OAuth token authentication working correctly in standalone test scripts.

**Symptoms:**
- Direct test scripts (`test_bearer_auth.py`) successfully obtained OAuth tokens and made API calls
- API endpoints returned `{"success": false, "error": "Connection error"}` 
- No detailed error information in logs

### Root Cause Analysis

#### 1. Client Caching Problem
**Issue:** Azure OpenAI clients were cached in memory with tokens from creation time
```python
# Problematic pattern
if self._azure_client is None:
    token = await oauth_service.get_token()
    self._azure_client = AsyncAzureOpenAI(
        default_headers={"Authorization": f"Bearer {token}"}
    )
return self._azure_client  # Always returns client with original token
```

**Impact:** Once created, clients continued using expired tokens even after new tokens were available.

#### 2. Token Expiration Handling
**Issue:** No automatic detection or handling of token expiration
- Tokens expire after 1 hour
- No proactive refresh mechanism
- No retry logic for authentication errors

#### 3. Process Isolation
**Issue:** Test scripts and API server ran in separate processes
- Test scripts created fresh clients each time
- API server used cached clients with potentially expired tokens
- No shared token state between processes

## Solution Implementation

### 1. Enhanced OAuth Service (`azure_oauth.py`)

#### Token Expiration Detection
```python
def is_token_expiring(self, buffer_seconds: int = 300) -> bool:
    """Check if token is expiring within buffer_seconds (default 5 minutes)."""
    if not self._token_expiry_time:
        return True
    
    current_time = time.time()
    return current_time >= (self._token_expiry_time - buffer_seconds)
```

#### Force Refresh Capability
```python
async def get_token(self, force_refresh: bool = False) -> str:
    """Get valid OAuth token with optional force refresh."""
    should_refresh = (
        force_refresh or
        not self._cached_token or
        not self._token_expiry_time or
        current_time >= self._token_expiry_time
    )
    # ... refresh logic
```

### 2. Smart Client Management (`base_ai.py`)

#### Proactive Client Refresh
```python
async def _get_azure_client(self) -> AsyncAzureOpenAI:
    # Check if we need to refresh the client due to token expiring
    if self._azure_client is not None and oauth_service.is_token_expiring():
        logger.info("Token is expiring, refreshing Azure OpenAI client")
        self._azure_client = None
    
    if self._azure_client is None:
        token = await oauth_service.get_token()
        # Create new client with fresh token
```

#### Authentication Error Detection
```python
def _is_auth_error(self, error_str: str) -> bool:
    """Check if error is related to authentication."""
    auth_error_indicators = [
        "401", "unauthorized", "authentication", 
        "invalid_token", "token_expired", "access_denied", "forbidden"
    ]
    return any(indicator in error_str.lower() for indicator in auth_error_indicators)
```

#### Automatic Retry Mechanism
```python
async def generate_text(self, ..., max_retries: int = 2) -> Dict[str, Any]:
    for attempt in range(max_retries + 1):
        try:
            # Attempt API call
            response = await client.ainvoke(messages)
            return success_result
        except Exception as e:
            if self._is_auth_error(str(e)) and attempt < max_retries:
                logger.info("Authentication error detected, refreshing auth and retrying")
                await self.refresh_auth()
                continue  # Retry with new token
            # Handle final failure
```

## Key Improvements

### 1. Preventive Refresh
- Tokens are refreshed 5 minutes before expiration
- Clients are recreated proactively to avoid authentication failures

### 2. Automatic Recovery
- Authentication errors trigger automatic token refresh and retry
- Up to 2 retry attempts for resilience
- Graceful degradation on persistent failures

### 3. Error Classification
- Distinguishes authentication errors from other types of failures
- Only retries on authentication-related errors
- Prevents infinite retry loops

### 4. Enhanced Logging
- Detailed logging for token refresh operations
- Clear error messages for debugging
- Tracking of retry attempts

## Testing Results

### Before Fix
```bash
curl -X 'POST' 'http://localhost:8000/api/v1/ai/chat/simple' \
  -H 'Content-Type: application/json' \
  -d '{"message": "hi", "max_tokens": 100}'

# Result: {"success":false,"error":"Connection error."}
```

### After Fix
```bash
curl -X 'POST' 'http://localhost:8000/api/v1/ai/chat/simple' \
  -H 'Content-Type: application/json' \
  -d '{"message": "hi", "max_tokens": 100}'

# Result: {"text":"你好！有什么我可以帮你的吗？","model":"gpt-4o","tokens_used":1,"success":true,"error":""}
```

## Best Practices Learned

### 1. Token Management
- Always implement token expiration detection
- Use buffer time for proactive refresh (5-10 minutes before expiration)
- Implement force refresh capability for error recovery

### 2. Client Lifecycle
- Don't cache clients indefinitely with static tokens
- Implement client refresh logic based on token state
- Clear client cache when tokens are refreshed

### 3. Error Handling
- Classify errors by type (auth vs. network vs. service)
- Implement appropriate retry strategies for each error type
- Limit retry attempts to prevent infinite loops

### 4. Monitoring & Debugging
- Log token refresh operations with timestamps
- Track retry attempts and their outcomes
- Provide clear error messages for different failure scenarios

## Configuration Recommendations

### Environment Variables
```bash
# OAuth Configuration
MS_OAUTH_CLIENT_ID=your-azure-app-client-id
MS_OAUTH_CLIENT_SECRET=your-azure-app-client-secret
MS_OAUTH_GRANT_TYPE=client_credentials
MS_OAUTH_SCOPE=https://cognitiveservices.azure.com/.default
MS_OAUTH_URL=https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

### Token Refresh Settings
- **Buffer Time**: 300 seconds (5 minutes) before expiration
- **Max Retries**: 2 attempts for authentication errors
- **Token Validity**: 3600 seconds (1 hour) from Azure

## Future Improvements

1. **Distributed Token Cache**: Implement Redis-based token sharing for multi-instance deployments
2. **Health Checks**: Add endpoint to verify token validity and refresh status
3. **Metrics**: Track token refresh frequency and authentication error rates
4. **Circuit Breaker**: Implement circuit breaker pattern for persistent authentication failures 