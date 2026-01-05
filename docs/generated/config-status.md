| Key | Type | Notes |
| --- | ---- | ----- |
| `STATUS_LENGTH` | `number` | The default length of the status list. Can be overridden per tenant.  (default: `10000`) |
| `STATUS_BITS` | `number` | The default number of bits used per status entry. Can be overridden per tenant.  (default: `1`) |
| `STATUS_TTL` | `number` | The default TTL in seconds for status list JWTs. Verifiers can cache the JWT until expiration. Can be overridden per tenant.  (default: `3600`) |
| `STATUS_IMMEDIATE_UPDATE` | `boolean` | If true, regenerate status list JWT immediately on every status change. If false (default), use lazy regeneration when TTL expires. Can be overridden per tenant.  (default: `false`) |
