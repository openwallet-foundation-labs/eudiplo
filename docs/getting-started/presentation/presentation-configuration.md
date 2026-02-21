# Presentation Configuration

This guide covers how to create, manage, and configure presentation requests in
EUDIPLO. Presentation configurations define what credentials and claims should
be requested from users.

---

## Configuration Structure

**Example Presentation Configuration (PID):**

```json
--8<-- "assets/config/demo/presentation/pid.json"
```

---

## Configuration Fields

- `id`: **REQUIRED** - Unique identifier for the presentation configuration.
- `description`: **REQUIRED** - Human-readable description of the presentation. Will not be displayed to the end user.
- `dcql_query`: **REQUIRED** - DCQL query defining the requested credentials and claims following the [DCQL specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-digital-credentials-query-l)
- `registrationCert`: **OPTIONAL** - Registration certificate containing legal and privacy information about the verifier. See [Registration Certificate](../registrar.md#registration-certificate) for details.
- `webhook`: **OPTIONAL** - Webhook configuration for receiving verified presentations asynchronously. See [Webhook Integration](../../architecture/webhooks.md#presentation-webhook) for details.
- `redirectUri`: **OPTIONAL** - URI to redirect the user to after completing the presentation. This is useful for web applications that need to return the user to a specific page after verification. You can use the `{sessionId}` placeholder in the URI, which will be replaced with the actual session ID (e.g., `https://example.com/callback?session={sessionId}`).
- `transaction_data`: **OPTIONAL** - Array of transaction data objects to include in the OID4VP authorization request. See [Transaction Data](transaction-data.md) for details.

!!! Info

    If no webhook is configured, the presentation result can be fetched by querying the `/session` endpoint with the `sessionId`.
