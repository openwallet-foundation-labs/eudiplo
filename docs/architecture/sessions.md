# Sessions Management

EUDIPLO manages sessions for credential issuance and verification, bound
to each tenant. When using the [Interactive Authorization Endpoint (IAE)](./iae.md),
the session tracks the multi-step authorization flow, including completed steps
and collected data. Sessions are stored in the database and can be
managed via the `/sessions` endpoint. You can retrieve a specific session via
`/sessions/{id}`.

## Session Cleanup

To tidy up old sessions, an interval is set to clean up older sessions. The
cleanup behavior can be configured both globally (via environment variables) and
per-tenant (via the Session Config API or the client UI).

Other elements like persisted status mapping (the binding between a session ID
and a status list reference) are not deleted with this process.

### Cleanup Modes

EUDIPLO supports two cleanup modes:

- **Full** (default): Deletes the entire session record from the database.
- **Anonymize**: Keeps session metadata (ID, **original status**, timestamps)
  but removes personal data including credentials, credential payloads, auth
  queries, offers, and request objects.

Anonymize mode is useful for audit and compliance scenarios where you need to
retain evidence that a session occurred without storing personal data. The
original session status is preserved, so historical statistics remain accurate.
For real-time monitoring, use the Prometheus metrics exposed by EUDIPLO.

## Per-Tenant Configuration

Each tenant can override the global session settings via the `/session-config`
endpoint or through the client UI under **Session Management > Session Config**.

For the full API specification, see the [Session Config API](../api/index.md#tag/session-config).

### Configuration Options

| Field         | Type     | Description                                                       |
| ------------- | -------- | ----------------------------------------------------------------- |
| `ttlSeconds`  | `number` | Time-to-live in seconds (minimum 60). Omit to use global default. |
| `cleanupMode` | `string` | Either `full` or `anonymize`. Omit to use global default.         |

## Global Configuration

The global defaults are configured via environment variables:

--8<-- "docs/generated/config-session.md"
