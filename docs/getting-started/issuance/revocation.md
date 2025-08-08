# Credential Revocation

EUDIPLO provides comprehensive credential revocation capabilities using OAuth
Token Status Lists. This guide covers how to enable, manage, and use credential
revocation.

---

## Overview

Credential revocation allows issuers to invalidate credentials after they have
been issued. This is essential for scenarios such as:

- Employee termination or role changes
- Security breaches or compromised credentials
- Credential expiration or replacement
- Legal or compliance requirements

---

## Enabling Status Management

To enable revocation for credentials, set `statusManagement: true` in your
credential configuration:

```json
{
    "id": "employee-badge",
    "statusManagement": true,
    "config": {
        "format": "dc+sd-jwt"
    },
    "claims": {
        "employee_id": "EMP12345",
        "department": "Engineering"
    }
}
```

When status management is enabled:

- Each issued credential includes a `status` claim
- The status claim references a status list maintained by EUDIPLO
- Individual credentials can be revoked without affecting others
- Status changes are immediate and globally accessible

---

## How Status Lists Work

### Status List Structure

EUDIPLO maintains status lists that track the revocation state of credentials:

- **Status List URL**: Public endpoint where verifiers can check status
- **Status List Index**: Unique position for each credential in the list
- **Status Values**:
    - `0` = Valid/Active
    - `1` = Revoked/Suspended

### Credential Status Claim

When a credential is issued with status management enabled, it includes a status
claim:

```json
{
    "status": {
        "status_list": {
            "idx": 42,
            "uri": "https://issuer.example.com/status/list/1"
        }
    }
}
```

This allows verifiers to check the credential's current status by querying the
status list.

---

## Revoking Credentials

### Single Credential Revocation

Revoke a specific credential for a session:

```bash
curl -X 'POST' \
  'http://localhost:3000/session/revoke' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "59d22466-b403-4b37-b1d0-20163696ade7",
    "credentialConfigurationId": "employee-badge",
    "status": 1
  }'
```

### Restoring Credentials

To restore a revoked credential, set the status back to valid:

```bash
curl -X 'POST' \
  'http://localhost:3000/session/revoke' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "59d22466-b403-4b37-b1d0-20163696ade7",
    "credentialConfigurationId": "employee-badge",
    "status": 0
```

---

## Status Values

| Value | Status  | Description                                            |
| ----- | ------- | ------------------------------------------------------ |
| `0`   | Valid   | Credential is active and valid                         |
| `1`   | Revoked | Credential has been revoked and should not be accepted |

---

## Integration Examples

### Employee Termination Workflow

```bash
# 1. Get session ID from HR system
SESSION_ID="employee-session-123"

# 2. Revoke employee badge
curl -X 'POST' \
  'http://localhost:3000/session/revoke' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "credentialConfigurationId": "employee-badge",
    "status": 1
  }'

# 3. Revoke access cards
curl -X 'POST' \
  'http://localhost:3000/session/revoke' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "credentialConfigurationId": "access-card",
    "status": 1
  }'
```

### Automated Revocation Script

```bash
#!/bin/bash

# Revoke credentials for a list of sessions
SESSIONS=("session-1" "session-2" "session-3")
CREDENTIAL_TYPE="temporary-pass"

for session in "${SESSIONS[@]}"; do
    echo "Revoking credentials for session: $session"

    curl -s -X 'POST' \
      'http://localhost:3000/session/revoke' \
      -H 'Authorization: Bearer eyJhb...npoNk' \
      -H 'Content-Type: application/json' \
      -d '{
        "sessionId": "'$session'",
        "credentialConfigurationId": "'$CREDENTIAL_TYPE'",
        "status": 1
      }'

    echo "✓ Revoked credentials for $session"
done
```

---

## Verifier Integration

Verifiers can check credential status by querying the status list endpoint:

### Status List Endpoint

```bash
curl -X 'GET' \
  'https://issuer.example.com/status/list/1' \
  -H 'accept: application/json'
```

### Status Check Response

```json
{
    "iss": "https://issuer.example.com",
    "sub": "https://issuer.example.com/status/list/1",
    "iat": 1609459200,
    "status_list": {
        "bits": 1,
        "lst": "eNrbuRgAAhcBNQ"
    }
}
```

The `lst` field contains a compressed bitstring where each bit represents the
status of a credential at that index.

---

## Data Storage and Privacy

### What is Stored

EUDIPLO stores minimal data for revocation:

- Session ID
- Status list URL
- Status list index
- Current status value

### What is NOT Stored

- Personal data from credentials
- Credential content
- User identifying information
- Detailed revocation reasons

### Data Retention

- Status mappings persist beyond session cleanup
- Only index and status information is retained
- No personal or sensitive data is stored long-term

---

## Troubleshooting

### Common Issues

#### Revocation Not Taking Effect

```bash
# Check session exists
curl -X 'GET' \
  'http://localhost:3000/session/YOUR_SESSION_ID' \
  -H 'Authorization: Bearer eyJhb...npoNk'

# Verify credential configuration ID
curl -X 'GET' \
  'http://localhost:3000/issuer-management/credentials' \
  -H 'Authorization: Bearer eyJhb...npoNk'
```

#### Status List Not Accessible

1. Check network connectivity
2. Verify status list URL in credential
3. Confirm issuer endpoint is accessible
4. Check for proper CORS configuration

#### Performance Issues

1. Monitor status list size
2. Check cache configuration
3. Verify database performance
4. Consider status list rotation

---

## Next Steps

- Learn about [Advanced Features](advanced-features.md) for enhanced credential
  management
- Use the [API Guide](api-guide.md) to implement revocation workflows

```

```
