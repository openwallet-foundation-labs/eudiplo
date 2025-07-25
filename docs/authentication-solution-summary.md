# Authentication Configuration Solution Summary - OpenID4VC Flows

## What We Built

I've created a comprehensive solution for storing authentication methods in your
issuance process that maps directly to OpenID4VC flows. This addresses the need
to:

- Select the appropriate OpenID4VC flow for credential issuance
- Store exactly one flow configuration per issuance configuration
- Provide specific configurations for each flow type
- Ensure type safety and validation
- Maintain clean and extensible code that follows OpenID4VC specifications

## Files Created/Modified

### 1. Core DTO and Types

- **`/src/issuer/issuance/dto/authentication-config.dto.ts`** - Main
  configuration classes and types
- **`/src/issuer/issuance/dto/authentication-config.helper.ts`** - Utility
  functions for type-safe operations

### 2. Entity Updates

- **`/src/issuer/issuance/entities/issuance-config.entity.ts`** - Updated to use
  the new authentication configuration
- **`/src/issuer/issuance/dto/issuance.dto.ts`** - Updated DTO for API
  operations

### 3. Documentation

- **`/docs/authentication-configuration.md`** - Complete usage guide and
  examples
- **`/docs/migration-example.md`** - Step-by-step migration guide for existing
  code

## Key Features

### 1. Discriminated Union Pattern for OpenID4VC Flows

```typescript
type AuthenticationConfig =
    | { method: 'none' } // Pre-authorized code flow
    | { method: 'auth'; config: AuthenticationUrlConfig } // OID4VCI authorized code flow
    | {
          method: 'presentationDuringIssuance';
          config: PresentationDuringIssuanceConfig;
      }; // OID4VP flow
```

### 2. Type-Safe Configuration Classes for OpenID4VC

- `AuthenticationUrlConfig` - For OID4VCI authorized code flow with optional
  webhooks
- `PresentationDuringIssuanceConfig` - For OID4VP flow requirements
- `AuthenticationConfigDto` - Validation-ready DTO for API endpoints

### 3. Utility Helper Functions

```typescript
// Type guards for OpenID4VC flows
AuthenticationConfigHelper.isNoneAuth(config); // Pre-authorized code flow
AuthenticationConfigHelper.isAuthUrlAuth(config); // OID4VCI authorized code flow
AuthenticationConfigHelper.isPresentationDuringIssuanceAuth(config); // OID4VP flow

// Getters
AuthenticationConfigHelper.getAuthUrl(config);
AuthenticationConfigHelper.getPresentationConfig(config);

// Creators for OpenID4VC flows
AuthenticationConfigHelper.createNoneConfig(); // Pre-authorized code flow
AuthenticationConfigHelper.createAuthConfig(url, webhook); // OID4VCI authorized code flow
AuthenticationConfigHelper.createPresentationConfig(presentation); // OID4VP flow
```

## Database Storage

The solution uses a single JSON column to store all OpenID4VC flow
configuration:

```sql
-- Instead of multiple columns:
authentication ENUM('none', 'auth', 'presentationDuringIssuance'),
auth_url VARCHAR(255),
presentation_during_issuance JSON

-- We now have:
authentication_config JSON NOT NULL
```

Example storage for OID4VCI authorized code flow:

```json
{
    "method": "auth",
    "config": {
        "authUrl": "https://auth.example.com/login",
        "webhook": {
            "url": "https://api.example.com/webhook",
            "auth": {
                "type": "apiKey",
                "config": {
                    "headerName": "Authorization",
                    "value": "Bearer token"
                }
            }
        }
    }
}
```

## Usage Examples

### Creating OpenID4VC Flow Configurations

```typescript
// Pre-authorized code flow (no user authentication)
const config1 = { method: 'none' };

// OID4VCI authorized code flow (user redirect for authentication)
const config2 = {
    method: 'auth',
    config: {
        authUrl: 'https://auth.example.com/login',
        webhook: {
            /* optional webhook config */
        },
    },
};

// OID4VP flow (credential presentation required)
const config3 = {
    method: 'presentationDuringIssuance',
    config: {
        presentation: {
            /* presentation config with existing webhook support */
        },
    },
};
```

### Type-Safe OpenID4VC Flow Processing

```typescript
switch (authConfig.method) {
    case 'none':
        // Use pre-authorized code flow - direct credential issuance
        break;
    case 'auth':
        // Use OID4VCI authorized code flow - TypeScript knows authConfig.config.authUrl exists
        redirectUserForAuthentication(authConfig.config.authUrl);
        break;
    case 'presentationDuringIssuance':
        // Use OID4VP flow - TypeScript knows authConfig.config.presentation exists
        sendOID4VPRequest(authConfig.config.presentation);
        break;
}
```

## Advantages

1. **OpenID4VC Compliance** - Direct mapping to standard OpenID4VC flows
2. **Type Safety** - TypeScript prevents runtime errors with flow configurations
3. **Single Source of Truth** - One field contains all flow information
4. **Validation** - Automatic validation via class-validator for each flow type
5. **Extensibility** - Easy to add new OpenID4VC flows as they are standardized
6. **Clean API** - No more checking multiple optional fields
7. **Database Efficiency** - Single JSON column vs multiple columns
8. **Standards-Based** - Follows OpenID4VC specifications exactly

## Next Steps

1. **Test the Implementation** - Create unit tests for the new structure
2. **Create Migration Script** - Convert existing data to new format
3. **Update Services** - Migrate `AuthorizeService` and other dependent services
4. **API Documentation** - Update OpenAPI specs with new request/response
   formats
5. **Frontend Updates** - Update any frontend code that creates issuance
   configurations

This solution provides a robust, type-safe, and maintainable approach to storing
OpenID4VC flow configurations for your issuance process. It ensures proper flow
selection based on requirements while maintaining full compliance with OpenID4VC
specifications - whether you need pre-authorized code flows, authorized code
flows with user authentication, or OID4VP flows with credential presentation
requirements.
