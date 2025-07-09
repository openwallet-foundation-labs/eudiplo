# Webhooks

Eudiplo allows the configuration of webhook endpoints to integrate external
services during credential presentation and **presentation during issuance**
flows.

These webhooks enable you to receive or process data exchanged with the wallet,
either for validation or to generate new credentials dynamically.

---

## Supported Webhook Scenarios

| Flow                             | Purpose                                        | Config Location                            |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| **Presentation Webhook**         | Receives verified claims from the wallet       | `presentation/<id>.json` or `POST /oid4vp` |
| **Presentation During Issuance** | Receives claims required to issue a credential | `issuance/<id>.json`                       |

---

## Example Webhook Service

You can run a minimal Express server to test webhook interactions locally:

```bash
pnpm run end-rp.js
```

This starts a service on port `3001` with the following endpoints:

- `POST /consume`: Prints the presentation data — used for **presentation
  webhooks**.
- `POST /process`: Accepts a credential presentation and returns values to be
  issued — used for **presentation during issuance**.

> This example is designed for the local run, not the docker one. When using
> docker, you need to make sure that EUDIPLO is able to reach the webhook
> service running on your host machine.

---

## Webhook Configuration

### 1. Presentation Webhook

You can configure the webhook statically inside your `presentation/<id>.json`
file:

```json
{
    "webhook": "http://localhost:3001/consume"
}
```

Alternatively, the webhook can be passed dynamically via `POST /oid4vp`:

```json
{
    "requestId": "pid",
    "response_type": "uri",
    "webhook": "http://localhost:3001/consume"
}
```

### 2. Presentation During Issuance

Configure this in your `issuance/<id>.json`:

```json
{
    "presentation_during_issuance": {
        "type": "pid",
        "webhook": "http://localhost:3001/process"
    }
}
```

---

## Webhook Request Format

Webhooks receive an HTTP `POST` request with a simplified payload containing
only the **presented claims**.

### Example Payload

```json
{
    "credentials": [
        {
            "address": {
                "locality": "Berlin"
            }
        }
    ],
    "sessionId": "session-id"
}
```

---

## Webhook Response Format

Only required for **presentation during issuance** webhooks.

The response must be a JSON object keyed by the ID of the credential
configuration. Each entry must contain the **claims** to issue.

### Example Response

Issuing a credential with the ID `citizen`:

```json
{
    "citizen": {
        "town": "Berlin"
    }
}
```

This response is passed into the issuance flow to create the final credential.
