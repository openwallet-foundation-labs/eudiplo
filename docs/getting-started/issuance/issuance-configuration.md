# Issuance Configuration

Issuance configurations define the parameters and settings for the issuance of credentials. This includes details such as the supported credential types, issuance policies, and any specific requirements for the issuance process.

---

## Basic Structure

**Example Issuance Configuration:**

```json
--8<-- "assets/config/root/issuance/issuance/pid.json"
```

## Configuration Fields

- `id` (string, required): Unique identifier for the issuance configuration.
- `description` (string, required): Description of the issuance configuration.
- `authenticationConfig` (object, required): Configuration for [authentication methods](./authentication.md).
- `credentialConfigIds` (array of strings, required): List of [credential configuration](./credential-configuration.md) IDs to be issued.
- `batchSize` (integer, optional): Number of credentials to issue in a batch (default is 1).
- `dPopRequired` (boolean, optional): Indicates whether DPoP (Demonstration of Proof-of-Possession) is required for this issuance configuration (default is true).
- `claimsWebhook`: (object, optional), webhook configuration for dynamic claims retrieval. See [Webhooks](../../architecture/webhooks.md#claims-webhook).
- `notifyWebhook`: (object, optional), webhook configuration for issuance status notifications. See [Webhooks](../../architecture/webhooks.md#notification-webhook).
