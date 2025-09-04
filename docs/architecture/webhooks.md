# Webhooks

EUDIPLO supports webhook endpoints that let external services actively participate in **issuance** and **presentation** flows.

While webhooks are optional, they make the overall process more dynamic—for example:

- requesting credential data from your backend service only when needed, or
- notifying your system when a wallet has completed a flow.

---

## Supported Webhook Scenarios

| Flow                             | Purpose                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| **Credential Issuance Webhook**  | Dynamically provides claims during the credential request process.       |
| **Presentation Webhook**         | Receives verified claims from the wallet.                                |
| **Presentation During Issuance** | Supplies verified claims required to issue a credential (mandatory).     |
| **Notification Webhook**         | Receives status updates (e.g., accepted or denied) about issuance flows. |

---

## Example Webhook Service

A simple webhook simulator is available in the  
[test/webhook](https://github.com/openwallet-foundation-labs/eudiplo/tree/main/test/webhook)  
directory. It can be run locally or deployed to a Cloudflare Worker, and is a good starting point for testing webhook functionality.

---

## Webhook Configuration

A webhook configuration object defines how EUDIPLO interacts with your service.

It must include:

- `url`: The endpoint URL. EUDIPLO sends an HTTP `POST` request with JSON data.
- `auth`: (Optional) Authentication configuration.
    - `type`: Authentication type. Currently supported:
        - `apiKey` – sends a key in a request header.

### Example

```json
{
  "url": "http://localhost:8787/consume",
  "auth": {
    "type": "apiKey",
    "config": {
      "headerName": "x-api-key",
      "value": "your-api-key"
    }
  }
}
```

---

## Webhook Types

### Claims Webhook

The **claims webhook** allows EUDIPLO to fetch attributes dynamically instead of embedding them in the credential offer. This is useful if:

- claims are not known in advance, or
- you want to avoid including sensitive data in the offer for privacy reasons.

- **Pre-authenticated / Authenticated flows:**  
  Called during the **credential request**.  
  If no webhook is configured, EUDIPLO falls back to claims provided in the credential offer or defined in the credential configuration.

- **Presentation during issuance (mandatory):**  
  Called during the **auth request**.  
  EUDIPLO sends verified claims to your service, which must respond with the claims to persist in the credential.  
  This avoids your service needing to manage state between the authentication and issuance phases.

```json
{
  "claimsWebhook": {
    "url": "http://localhost:8787/process",
    "auth": {
      "type": "apiKey",
      "config": {
        "headerName": "x-api-key",
        "value": "your-api-key"
      }
    }
  }
}
```

---

### Notification Webhook

The **notification webhook** receives the outcome of the issuance process (e.g., accepted or denied).  
This confirms that the wallet has received and accepted the credential.

```json
{
  "notifyWebhook": {
    "url": "http://localhost:8787/notify",
    "auth": {
      "type": "apiKey",
      "config": {
        "headerName": "x-api-key",
        "value": "your-api-key"
      }
    }
  }
}
```

If no notification webhook is configured, you can fetch the session result by querying the `/session` endpoint with the `sessionId`.

---

## Webhook Request Format

EUDIPLO sends an HTTP `POST` request with the following structure:

- `credentials`: Array of credential objects. Each includes:
    - `id`: The ID of the DCQL query.
    - `values`: The claims presented by the wallet.
        - SD-JWT VC–specific fields (e.g., `cnf`, `status`) are removed for simplicity.
    - `error`: Present instead of `values` if verification failed.
- `session`: The session ID identifying the request.

### Example Payload

```json
{
  "credentials": [
    {
      "id": "pid",
      "values": {
        "iss": "https://service.eudi-wallet.dev",
        "iat": 1751884150,
        "vct": "https://service.eudi-wallet.dev/credentials/vct/pid",
        "address": {
          "locality": "KÖLN",
          "postal_code": "51147",
          "street_address": "HEIDESTRAẞE 17"
        }
      }
    },
    {
      "id": "citizen",
      "error": "Credential verification failed: invalid signature"
    }
  ],
  "session": "a6318799-dff4-4b60-9d1d-58703611bd23"
}
```

!!! info

    Requests always use `Content-Type: application/json`. A retry mechanism is not yet implemented—if a webhook fails, the process halts. Retry support may be added in the future.

---

## Webhook Response Format

A response is required for:

- **presentation during issuance** webhooks, and
- **issuance** webhooks.

The response must be a JSON object keyed by the credential configuration ID. Each entry contains the **claims** to issue.

### Example Response

Issuing a credential with ID `citizen`:

```json
{
  "citizen": {
    "town": "Berlin"
  }
}
```

This response is injected into the issuance flow to create the final credential.
