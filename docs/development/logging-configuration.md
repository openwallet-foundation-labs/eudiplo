# Logging Configuration

The EUDIPLO Service provides flexible logging configuration to help with debugging, monitoring, and auditing.

## Configuration

--8<-- "docs/generated/config-logging.md"

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

## Logging Destinations

### Console Logging

Console logging is always enabled with formatting determined by the `LOG_FORMAT` configuration:

```bash
# Pretty formatting for human readability (default in development)
LOG_FORMAT=pretty

# JSON formatting for machine parsing (default in production)
LOG_FORMAT=json
```

### File Logging

The application supports logging to both console and file simultaneously, which is useful for debugging, auditing, and persisting logs for later analysis.

File logging is controlled via environment variables:

| Variable        | Description            | Default              |
| --------------- | ---------------------- | -------------------- |
| `LOG_TO_FILE`   | Enable logging to file | `false`              |
| `LOG_FILE_PATH` | Path to the log file   | `./logs/session.log` |

When `LOG_TO_FILE` is set to `true`, the system will:

1. Write all logs to the console with pretty formatting as usual
2. Write the same logs to the specified file in `LOG_FILE_PATH` in JSON format
3. Use synchronous file writes to ensure message order is maintained

#### Message Order Synchronization

The file logging is configured with `sync: true` to ensure that log messages are written in the exact order they are generated. This is especially important for session logging where the sequence of events matters.

#### Usage Example

To enable file logging, add the following to your `.env` file or environment variables:

```bash
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/sessions.log
```

#### Log File Format

The log files are written in JSON format for easy parsing and analysis by external tools. Each log entry is a complete JSON object on a new line.

#### Log Rotation

The current implementation does not include built-in log rotation. For production environments, it is recommended to use external log rotation tools like `logrotate` to manage log file size and retention.

## Disabling Specific Logger Services

### HTTP Request/Response Logging

To disable automatic HTTP request and response logging from Pino (useful during development when you want to reduce log noise):

```bash
# Disable HTTP request/response logging
LOG_ENABLE_HTTP_LOGGER=false

# Enable HTTP request/response logging
LOG_ENABLE_HTTP_LOGGER=true
```

**Note:** This controls the built-in HTTP logging from the Pino HTTP logger. Session-specific logging is controlled separately.

### SessionLoggerService

To disable all session-related logging (useful during debugging when you want to focus on other components):

```bash
# Disable SessionLoggerService logs
LOG_ENABLE_SESSION_LOGGER=false

# Enable SessionLoggerService logs
LOG_ENABLE_SESSION_LOGGER=true
```

## Development Scenarios

### Debugging Authentication Issues

```bash
LOG_LEVEL=debug
LOG_ENABLE_SESSION_LOGGER=true
LOG_ENABLE_HTTP_LOGGER=false
```

This will show detailed debug logs but hide HTTP request noise.

### Monitoring Session Flows

```bash
LOG_LEVEL=info
LOG_ENABLE_SESSION_LOGGER=true
LOG_ENABLE_HTTP_LOGGER=false
```

This will show all session flow events for monitoring credential issuance and verification, but without HTTP request logs.

### Full Development Logging

```bash
LOG_LEVEL=debug
LOG_ENABLE_SESSION_LOGGER=true
LOG_ENABLE_HTTP_LOGGER=true
```

This will show everything including HTTP requests, responses, and session flows.

### Production Monitoring

```bash
LOG_LEVEL=warn
LOG_ENABLE_SESSION_LOGGER=true
LOG_ENABLE_HTTP_LOGGER=false
LOG_TO_FILE=true
LOG_FILE_PATH=/var/log/eudiplo/session.log
```

This will only show warnings, errors, and important session events without HTTP noise, and write all logs to a file for later analysis.

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
LOG_FORMAT=pretty

# Logging destinations
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/session.log

# HTTP request/response logging control
LOG_ENABLE_HTTP_LOGGER=false

# Session logger control
LOG_ENABLE_SESSION_LOGGER=true
```

## Runtime Control

You can control logging at runtime by restarting the service with different environment variables, or by implementing log level changes via API endpoints if needed.
