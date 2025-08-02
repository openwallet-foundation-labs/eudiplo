# Sessions Management

EUDIPLO manages sessions for credential issuance and verification and are bound
to each tenant. In case for a presentation during issuance, both actions are
handled in the same session. Sessions are stored in the database and can be
managed via the `/sessions` endpoint. You can retrieve a specific session via
`/sessions/{id}`.

To tidy up old sessions, an interval is set to delete older session. The default
values can be configured by setting:

- `SESSION_TIDY_UP_INTERVAL`: value in seconds, default: 3600 (1 hour)
- `SESSION_TTL`: value in seconds, default: 86400 (24 hours)

Other elements as persisted status mapping (the binding between a session id and
a status list reference) are not deleted with this process.
