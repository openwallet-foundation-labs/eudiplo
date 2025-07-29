# Webhooks

EUDIPLO allows the configuration of webhook endpoints to integrate external
services during credential presentation and **presentation during issuance**
flows.

---

## Supported Webhook Scenarios

| Flow                             | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| **Presentation Webhook**         | Receives verified claims from the wallet                         |
| **Presentation During Issuance** | Receives claims required to issue a credential                   |
| **Notification Webhook**         | Receives notifications about the status of the issuance process. |

---

## Example Webhook Service

In the
[test/webhook](https://github.com/openwallet-foundation-labs/eudiplo/tree/main/test/webhook)
directory, you can find a simple webhook simulator that can be used to test the
webhook functionality of the EUDIPLO service. It can be run locally or deployed
to a cloudflare worker.

---

## Webhook Configuration

A webhook object can be configured to pass the required information to the
EUDIPLO service. The object must contain the following fields:

- `url`: The URL of the webhook endpoint to which the data will be sent. The
  request will be sent as an HTTP `POST` request.
- `auth`: Optional authentication information for the webhook endpoint.
    - `type`: The type of authentication to use. Supported types are:
        - `apiKey`: API key authentication, where the key is sent in a header.

Here is an example of a webhook configuration:

```json
{
    "webhook": {
        "url": "http://localhost:8787/consume",
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

### 1. Presentation Webhook

You can configure the webhook statically inside your presentation or issuance
configuration or passing the webhook dynamically via offer creation:

### 2. Presentation During Issuance

```json
{
    "presentation_during_issuance": {
        "type": "pid",
        "webhook": {
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
}
```

### 3. Notification Webhook

When configured, it will send the notification response like accepted or denied
to the configured webhook endpoint. Then you can be sure that the Wallet has
received and accepted the credential.

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

---

## Webhook Request Format

Webhooks receive an HTTP `POST` request with a simplified payload containing
only the **presented claims**.

It is structured as follows:

- `credentials`: An array of credential objects, each containing:
    - `id`: The ID of the DCQL query to identify which was passed for the
      request.
    - `values`: The claims presented by the wallet. SD-JWT VC specific fields
      like cnf and status got removed for simplicity.
- `session`: The session ID used to identify the request.

In case the verification of a credential fails, an `error` field with a message
is included instead of the values.

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
