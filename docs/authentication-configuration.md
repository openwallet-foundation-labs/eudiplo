# Authentication Configuration for Issuance Process

This document explains the recommended approach for storing authentication
methods in the issuance process, which determines which OpenID4VC flow to use.

## Overview

The authentication configuration uses a discriminated union pattern that ensures
type safety and proper validation. Each authentication method corresponds to a
specific OpenID4VC flow, and only one method can be active at a time.

## OpenID4VC Flows and Authentication Methods

### 1. Pre-Authorized Code Flow (`none`)

Used when no user authentication is required. The credential is issued directly
using a pre-authorized code.

```typescript
const config: AuthenticationConfig = {
    method: 'none',
};
```

**Use case**: Direct credential issuance without user interaction (e.g., batch
issuance, automated processes)

### 2. OID4VCI Authorized Code Flow (`auth`)

Used when user authentication is required. The user will be redirected to an
external authentication URL as part of the OID4VCI authorized code flow.

```typescript
const config: AuthenticationConfig = {
    method: 'auth',
    config: {
        authUrl: 'https://auth.example.com/login',
        webhook: {
            url: 'https://api.example.com/webhook',
            auth: {
                type: 'apiKey',
                config: {
                    headerName: 'Authorization',
                    value: 'Bearer your-token',
                },
            },
        },
    },
};
```

**Use case**: When the issuer needs to authenticate the user before issuing
credentials (e.g., identity verification, account-based issuance)

### 3. OID4VP Flow (`presentationDuringIssuance`)

Used when a credential presentation is required before issuance. An OID4VP
request is sent to the wallet to present specific credentials.

```typescript
const config: AuthenticationConfig = {
    method: 'presentationDuringIssuance',
    config: {
        presentation: {
            type: 'oid4vp',
            webhook: {
                url: 'https://api.example.com/webhook',
                auth: {
                    type: 'apiKey',
                    config: {
                        headerName: 'Authorization',
                        value: 'Bearer your-token',
                    },
                },
            },
        },
    },
};
```

**Use case**: When the issuer needs to verify that the user possesses certain
credentials before issuing new ones (e.g., issuing a university diploma only if
the user can present a high school certificate)

## Database Storage

The authentication configuration is stored as a JSON column in the database:

```typescript
@Entity()
export class IssuanceConfig {
    // ... other fields

    @IsObject()
    @Column('json')
    authenticationConfig: AuthenticationConfig;
}
```

## API Usage

### Creating an Issuance Configuration

```typescript
// POST /issuer-management/issuance

// Pre-authorized code flow (no authentication)
{
    "credentialConfigs": ["credential-id-1", "credential-id-2"],
    "authenticationConfig": {
        "method": "none"
    }
}

// OID4VCI authorized code flow (user authentication)
{
    "credentialConfigs": ["credential-id-1", "credential-id-2"],
    "authenticationConfig": {
        "method": "auth",
        "config": {
            "authUrl": "https://auth.example.com/login",
            "webhook": {
                "url": "https://api.example.com/webhook",
                "auth": {
                    "type": "apiKey",
                    "config": {
                        "headerName": "Authorization",
                        "value": "Bearer your-token"
                    }
                }
            }
        }
    }
}

// OID4VP flow (credential presentation)
{
    "credentialConfigs": ["credential-id-1", "credential-id-2"],
    "authenticationConfig": {
        "method": "presentationDuringIssuance",
        "config": {
            "presentation": {
                "type": "oid4vp",
                "webhook": {
                    "url": "https://api.example.com/webhook"
                }
            }
        }
    }
}
```

## Type Safety and Validation

### Using Helper Functions

```typescript
import { AuthenticationConfigHelper } from './authentication-config.helper';

// Type-safe checking
if (AuthenticationConfigHelper.isAuthUrlAuth(config)) {
    // TypeScript knows config.config.authUrl exists
    // This will trigger OID4VCI authorized code flow
    const authUrl = config.config.authUrl;
    console.log('Redirect user to auth URL:', authUrl);
}

if (AuthenticationConfigHelper.isPresentationDuringIssuanceAuth(config)) {
    // TypeScript knows config.config.presentation exists
    // This will trigger OID4VP flow
    const presentation = config.config.presentation;
    console.log('Send OID4VP request:', presentation);
}

if (AuthenticationConfigHelper.isNoneAuth(config)) {
    // Use pre-authorized code flow
    console.log('Using pre-authorized code flow');
}

// Utility methods
const authUrl = AuthenticationConfigHelper.getAuthUrl(config);
const presentationConfig =
    AuthenticationConfigHelper.getPresentationConfig(config);
```

### Creating Configurations Programmatically

```typescript
// Create different OpenID4VC flow configurations
const preAuthConfig = AuthenticationConfigHelper.createNoneConfig();

const oid4vciConfig = AuthenticationConfigHelper.createAuthConfig(
    'https://auth.example.com/login',
    webhookConfig,
);

const oid4vpConfig = AuthenticationConfigHelper.createPresentationConfig(
    presentationDuringIssuanceConfig,
);
```

## Advantages of This Approach

1. **OpenID4VC Compliance**: Maps directly to standard OpenID4VC flows
   (pre-authorized code, authorized code, OID4VP)

2. **Type Safety**: TypeScript ensures that each flow has the correct
   configuration structure

3. **Validation**: Class-validator automatically validates the configuration
   based on the selected flow

4. **Single Source of Truth**: Only one flow can be active, preventing
   configuration conflicts

5. **Extensibility**: New OpenID4VC flows can be easily added by extending the
   union type

6. **Clean Database Schema**: All authentication configuration is stored in a
   single JSON column

7. **Standards-Based**: Follows OpenID4VC specifications for credential issuance
   flows

## Migration from Previous Approach

If you're migrating from the previous approach with separate fields:

```typescript
// Old approach
{
    authentication: 'auth',
    authUrl: 'https://auth.example.com/login',
    presentation_during_issuance: undefined
}

// New approach - clearly indicates OID4VCI authorized code flow
{
    authenticationConfig: {
        method: 'auth',
        config: {
            authUrl: 'https://auth.example.com/login'
        }
    }
}
```

## Example Service Usage

```typescript
@Injectable()
export class IssuanceFlowService {
    async processIssuanceRequest(issuanceConfig: IssuanceConfig, request: any) {
        const { authenticationConfig } = issuanceConfig;

        switch (authenticationConfig.method) {
            case 'none':
                // Use pre-authorized code flow
                return this.handlePreAuthorizedFlow(request);

            case 'auth':
                // Use OID4VCI authorized code flow - redirect user
                return this.handleAuthorizedCodeFlow(
                    authenticationConfig.config.authUrl,
                    request,
                );

            case 'presentationDuringIssuance':
                // Use OID4VP flow - request credential presentation
                return this.handlePresentationFlow(
                    authenticationConfig.config.presentation,
                    request,
                );

            default:
                throw new Error('Unknown authentication method');
        }
    }

    private async handlePreAuthorizedFlow(request: any) {
        // Direct credential issuance using pre-authorized code
        return this.issueCredentialDirectly(request);
    }

    private async handleAuthorizedCodeFlow(authUrl: string, request: any) {
        // Redirect user to authentication URL for OID4VCI flow
        return { redirect_uri: authUrl, flow: 'oid4vci_auth_code' };
    }

    private async handlePresentationFlow(
        presentationConfig: any,
        request: any,
    ) {
        // Send OID4VP request for credential presentation
        return this.createOID4VPRequest(presentationConfig, request);
    }
}
```

This approach provides a robust, type-safe, and maintainable solution for
storing authentication configurations that directly maps to OpenID4VC flows. It
ensures proper flow selection based on the authentication requirements and
maintains compatibility with OpenID4VC specifications.
