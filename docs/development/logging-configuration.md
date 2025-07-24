# Logging Configuration

The EUDIPLO Service provides flexible logging configuration to help with
debugging and monitoring.

## Basic Log Level Configuration

Control the overall log level using the `LOG_LEVEL` environment variable:

```bash
# Show all logs (debug, info, warn, error)
LOG_LEVEL=debug

# Show only info, warn, error (default)
LOG_LEVEL=info

# Show only warnings and errors
LOG_LEVEL=warn

# Show only errors
LOG_LEVEL=error
```

## Disabling Specific Logger Services

### HTTP Request/Response Logging

To disable automatic HTTP request and response logging from Pino (useful during
development when you want to reduce log noise):

```bash
# Disable HTTP request/response logging
LOG_DISABLE_HTTP_LOGGER=true

# Enable HTTP request/response logging (default)
LOG_DISABLE_HTTP_LOGGER=false
```

**Note:** This controls the built-in HTTP logging from the Pino HTTP logger.
Session-specific logging is controlled separately.

### SessionLoggerService

To disable all session-related logging (useful during debugging when you want to
focus on other components):

```bash
# Disable SessionLoggerService logs
LOG_DISABLE_SESSION_LOGGER=true

# Enable SessionLoggerService logs (default)
LOG_DISABLE_SESSION_LOGGER=false
```

## Development Scenarios

### Debugging Authentication Issues

```bash
LOG_LEVEL=debug
LOG_DISABLE_SESSION_LOGGER=true
LOG_DISABLE_HTTP_LOGGER=true
```

This will show detailed debug logs but hide session-related and HTTP request
noise.

### Monitoring Session Flows

```bash
LOG_LEVEL=info
LOG_DISABLE_SESSION_LOGGER=false
LOG_DISABLE_HTTP_LOGGER=true
```

This will show all session flow events for monitoring credential issuance and
verification, but without HTTP request logs.

### Full Development Logging

```bash
LOG_LEVEL=debug
LOG_DISABLE_SESSION_LOGGER=false
LOG_DISABLE_HTTP_LOGGER=false
```

This will show everything including HTTP requests, responses, and session flows.

### Production Monitoring

```bash
LOG_LEVEL=warn
LOG_DISABLE_SESSION_LOGGER=false
LOG_DISABLE_HTTP_LOGGER=true
```

This will only show warnings, errors, and important session events without HTTP
noise.

## Log Structure

Session logs include structured data:

```json
{
    "level": "info",
    "time": "2025-07-20T10:30:45.123Z",
    "context": "SessionLoggerService",
    "sessionId": "session_123",
    "tenantId": "tenant_456",
    "flowType": "OID4VCI",
    "event": "flow_start",
    "stage": "initialization",
    "msg": "[OID4VCI] Flow started for session session_123 in tenant tenant_456"
}
```

## Environment Configuration

Add these to your `.env` file:

```bash
# Basic logging
LOG_LEVEL=info

# HTTP request/response logging control
LOG_DISABLE_HTTP_LOGGER=false

# Session logger control
LOG_DISABLE_SESSION_LOGGER=false
```

## Runtime Control

You can also control logging at runtime by restarting the service with different
environment variables, or by implementing log level changes via API endpoints if
needed.
