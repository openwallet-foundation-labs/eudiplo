# Real-time Session Status Updates

EUDIPLO provides a Server-Sent Events (SSE) endpoint for receiving real-time 
session status updates. This allows clients to subscribe to session changes
without polling, reducing server load and providing instant feedback.

## SSE Endpoint

```
GET /session/:id/events?token=JWT_TOKEN
```

### Authentication

The SSE endpoint requires JWT authentication via a query parameter. This is
because the browser's `EventSource` API does not support custom headers.

| Parameter | Type   | Required | Description                        |
|-----------|--------|----------|------------------------------------|
| `id`      | string | Yes      | The session ID to subscribe to     |
| `token`   | string | Yes      | Valid JWT access token             |

### Response Format

The endpoint returns a stream of Server-Sent Events. Each event contains:

```json
{
  "id": "session-uuid",
  "status": "active|fetched|completed|expired|failed",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

### Session Status Values

| Status      | Description                                           |
|-------------|-------------------------------------------------------|
| `active`    | Session created, waiting for wallet interaction       |
| `fetched`   | Credential offer/presentation request fetched by wallet |
| `completed` | Session successfully completed                        |
| `expired`   | Session expired before completion                     |
| `failed`    | Session failed due to an error                        |

## Usage Examples

### JavaScript (Browser)

```javascript
// Get a valid JWT token first
const token = await getAccessToken();

// Create EventSource with token as query parameter
const eventSource = new EventSource(
  `/session/${sessionId}/events?token=${token}`
);

// Handle incoming status updates
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Session ${data.id} status: ${data.status}`);
  
  // Close connection when session reaches terminal state
  if (['completed', 'expired', 'failed'].includes(data.status)) {
    eventSource.close();
  }
};

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  eventSource.close();
};
```

### Node.js

```javascript
import EventSource from 'eventsource';

const token = 'your-jwt-token';
const sessionId = 'session-uuid';

const eventSource = new EventSource(
  `http://localhost:3000/session/${sessionId}/events?token=${token}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
};

eventSource.onerror = (error) => {
  console.error('Connection error:', error);
};
```

### cURL

```bash
curl -N "http://localhost:3000/session/${SESSION_ID}/events?token=${JWT_TOKEN}"
```

## Connection Behavior

- **Initial Event**: Upon connection, the endpoint immediately sends the current
  session status.
- **Auto-reconnect**: Browsers automatically reconnect if the connection drops.
- **Keep-alive**: The server maintains the connection until the client
  disconnects or the session reaches a terminal state.

## Error Responses

| Status Code | Description                                    |
|-------------|------------------------------------------------|
| 401         | Missing or invalid JWT token                   |
| 404         | Session not found                              |

## Best Practices

1. **Token expiration**: Ensure your JWT token has sufficient lifetime for the
   expected session duration. Consider refreshing the token before it expires.

2. **Close on completion**: Always close the `EventSource` when the session
   reaches a terminal state (`completed`, `expired`, or `failed`) to free
   resources.

3. **Error handling**: Implement proper error handling to manage connection
   failures gracefully.

4. **Fallback polling**: For environments that don't support SSE, implement a
   fallback to polling the `GET /session/:id` endpoint.
