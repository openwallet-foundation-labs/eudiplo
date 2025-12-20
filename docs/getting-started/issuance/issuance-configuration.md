# Issuance Configuration

Issuance configurations define the parameters and settings for the issuance of credentials. This includes details such as the supported credential types, issuance policies, and any specific requirements for the issuance process.

---

## Basic Structure

**Example Issuance Configuration:**

```json
--8<-- "assets/config/root/issuance/issuance.json"
```

!!! Info

    The auto generated schema reference can be found in the [API Documentation](../../../api/openapi/#issuancedto)

## Configuration Fields

- `authServers` (array of strings, optional): Authentication server URL for the issuance process.
- `notifyWebhook` (object, optional): Webhook to send the result of the notification response. See [Webhooks](../../architecture/webhooks.md#notification-webhook).
- `batchSize` (number, optional): Value to determine the amount of credentials that are issued in a batch. Default is 1.
- `dPopRequired` (boolean, optional): Indicates whether DPoP is required for the issuance process. Default value is true.
- `display` (array of objects, required): The display information from the [OID4VCI spec](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-issuer-metadata:~:text=2%20or%20greater.-,display,-%3A%20OPTIONAL.%20A%20non). To host images or logos, you can use the [storage](../../architecture/storage.md) system provided by EUDIPLO.
