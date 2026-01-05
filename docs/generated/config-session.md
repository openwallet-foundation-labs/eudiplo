| Key | Type | Notes |
| --- | ---- | ----- |
| `SESSION_TIDY_UP_INTERVAL` | `number` | Interval in seconds to run session tidy up  (default: `3600`) |
| `SESSION_TTL` | `number` | Default time to live for sessions in seconds. Can be overridden per tenant.  (default: `86400`) |
| `SESSION_CLEANUP_MODE` | `string` | Default cleanup mode when sessions expire. 'full' deletes the entire session, 'anonymize' keeps metadata but removes personal data. Can be overridden per tenant.  (default: `full`) |
