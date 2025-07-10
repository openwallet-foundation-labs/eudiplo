# Management

## Authentication

Endpoints that are used to manage the service require authentication via an API
key. This key is set in the `.env` file as `AUTH_API_KEY`.

It has to be passed in the request header as `x-api-key`.

```http
curl -X 'POST' \
  'http://localhost:3000/vci/offer' \
  -H 'accept: application/json' \
  -H 'x-api-key: 1234' \
  -H 'Content-Type: application/json' \
  -d '{
  "response_type": "qrcode",
  "credentialConfigurationIds": [
    "pid"
  ]
}'
```

Other approaches like using OAuth2 or JWT are not supported at this time, but
feel free to contribute them.

## Sessions Management

EUDIPLO manages sessions for credential issuance and verification. In case for a
presentation during issuance, both actions are handled in the same session.
Sessions are stored in the database and can be managed via the `/sessions`
endpoint. You can retrieve a specific session via `/sessions/{id}`.

To tidy up old sessions, an interval is set to delete older session. The default
values can be configured by setting:

- `SESSION_TIDY_UP_INTERVAL`: value in seconds, default: 3600 (1 hour)
- `SESSION_TTL`: value in seconds, default: 86400 (24 hours)

Other elements as persisted status mapping (the binding between a session id and
a status list reference) are not deleted with this process.
