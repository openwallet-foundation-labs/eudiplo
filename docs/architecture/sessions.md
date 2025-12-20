# Sessions Management

EUDIPLO manages sessions for credential issuance and verification and are bound
to each tenant. In case for a presentation during issuance, both actions are
handled in the same session. Sessions are stored in the database and can be
managed via the `/sessions` endpoint. You can retrieve a specific session via
`/sessions/{id}`.

To tidy up old sessions, an interval is set to delete older session. The default
values can be configured.

Other elements as persisted status mapping (the binding between a session id and
a status list reference) are not deleted with this process.

## Configuration

--8<-- "docs/generated/config-session.md"
