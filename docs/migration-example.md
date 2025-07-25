# Migration Example: Updating AuthorizeService for OpenID4VC Flows

This document shows how to update the existing `AuthorizeService` to use the new
authentication configuration structure that properly maps to OpenID4VC flows.

## Current Implementation

The current implementation in `authorize.service.ts` checks for specific fields:

```typescript
// Current approach - checking separate fields
if (config.presentation_during_issuance) {
    const webhook = config.presentation_during_issuance.webhook;
    const response = await this.parseChallengeRequest(body, tenantId, webhook);
    res.status(400).send(response);
} else {
    await this.sendAuthorizationCode(res, body.issuer_state!, tenantId);
}
```

## New Implementation

Here's how to update the `authorizationChallengeEndpoint` method to use the new
structure with proper OpenID4VC flow handling:

```typescript
import { AuthenticationConfigHelper } from '../issuance/dto/authentication-config.helper';

async authorizationChallengeEndpoint(
    res: Response<any, Record<string, any>>,
    body: AuthorizeQueries,
    tenantId: string,
) {
    // Handle auth_session case (existing logic)
    if (body.auth_session) {
        const session = await this.sessionService.get(body.auth_session);
        if (!session) {
            throw new ConflictException(
                'auth_session not found or not provided in the request',
            );
        }
        await this.sendAuthorizationCode(res, body.auth_session, tenantId);
        return;
    }

    // Get the session and issuance configuration
    const session = await this.sessionService.get(body.issuer_state!);
    if (!session) {
        throw new Error('Credential offer not found');
    }

    const issuanceId = session.issuanceId!;
    const config = await this.issuanceService.getIssuanceConfigurationById(
        issuanceId,
        tenantId,
    );

    // NEW: Use the authentication configuration structure
    const { authenticationConfig } = config;

    switch (authenticationConfig.method) {
        case 'none':
            // Pre-authorized code flow - no authentication required
            await this.sendAuthorizationCode(res, body.issuer_state!, tenantId);
            break;

        case 'auth':
            // OID4VCI authorized code flow - redirect user for authentication
            const authUrl = authenticationConfig.config.authUrl;
            const webhook = authenticationConfig.config.webhook;

            res.status(401).send({
                error: 'authentication_required',
                auth_url: authUrl,
                auth_session: body.issuer_state,
                error_description: 'User authentication required for OID4VCI authorized code flow',
                webhook_config: webhook, // Include webhook if needed
            });
            break;

        case 'presentationDuringIssuance':
            // OID4VP flow - request credential presentation before issuance
            const presentationConfig = authenticationConfig.config.presentation;
            const presentationWebhook = presentationConfig.webhook;

            const response = await this.parseChallengeRequest(
                body,
                tenantId,
                presentationWebhook,
            );
            res.status(400).send(response);
            break;

        default:
            // TypeScript will catch this at compile time, but good to have for runtime safety
            throw new Error(\`Unknown authentication method: \${(authenticationConfig as any).method}\`);
    }
}
```

## Helper Methods

Add these utility methods to the service for type-safe access:

```typescript
/**
 * Get authentication URL if the method is 'auth'
 */
private getAuthUrl(config: IssuanceConfig): string | null {
    return AuthenticationConfigHelper.getAuthUrl(config.authenticationConfig);
}

/**
 * Get presentation configuration if the method is 'presentationDuringIssuance'
 */
private getPresentationConfig(config: IssuanceConfig): any | null {
    return AuthenticationConfigHelper.getPresentationConfig(config.authenticationConfig);
}

/**
 * Check if pre-authorized code flow should be used
 */
private usesPreAuthorizedFlow(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method === 'none';
}

/**
 * Check if OID4VCI authorized code flow should be used
 */
private usesAuthorizedCodeFlow(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method === 'auth';
}

/**
 * Check if OID4VP flow should be used
 */
private usesOID4VPFlow(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method === 'presentationDuringIssuance';
}
```

## Usage Examples in Other Methods

### In a middleware or guard:

```typescript
@Injectable()
export class AuthenticationGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { tenantId, issuanceId } = request.params;

        const config = await this.issuanceService.getIssuanceConfigurationById(
            issuanceId,
            tenantId,
        );

        // Type-safe checking for OpenID4VC flows
        if (
            AuthenticationConfigHelper.isNoneAuth(config.authenticationConfig)
        ) {
            return true; // Pre-authorized code flow - no authentication required
        }

        if (
            AuthenticationConfigHelper.isAuthUrlAuth(
                config.authenticationConfig,
            )
        ) {
            // OID4VCI authorized code flow - check if user has been authenticated
            return this.checkOID4VCIAuthentication(
                request,
                config.authenticationConfig.config.authUrl,
            );
        }

        if (
            AuthenticationConfigHelper.isPresentationDuringIssuanceAuth(
                config.authenticationConfig,
            )
        ) {
            // OID4VP flow - check if presentation has been completed
            return this.checkOID4VPCompleted(
                request,
                config.authenticationConfig.config.presentation,
            );
        }

        return false;
    }
}
```

### In the OID4VCI service:

```typescript
async processCredentialRequest(request: CredentialRequest, tenantId: string) {
    const config = await this.getIssuanceConfig(request.sessionId, tenantId);

    // Check which OpenID4VC flow to use
    if (!AuthenticationConfigHelper.isNoneAuth(config.authenticationConfig)) {
        // Either OID4VCI authorized code flow or OID4VP flow requires verification
        await this.verifyFlowCompleted(request, config.authenticationConfig);
    }

    // Proceed with credential issuance using appropriate flow
    return this.issueCredential(request, config.authenticationConfig.method);
}
```

## Benefits of the New Approach

1. **OpenID4VC Compliance**: Direct mapping to standard OpenID4VC flows
   (pre-authorized code, authorized code, OID4VP)
2. **Type Safety**: TypeScript catches invalid configurations at compile time
3. **Single Source of Truth**: All flow configuration is centralized in one
   place
4. **Extensible**: Easy to add new OpenID4VC flows as they are standardized
5. **Readable**: Clear intent with discriminated unions that match OpenID4VC
   specifications
6. **Maintainable**: Less prone to bugs from checking multiple optional fields
7. **Standards-Based**: Follows OpenID4VC specifications for credential issuance

## Migration Steps

1. Update the database schema to use the new `authenticationConfig` JSON column
2. Create a migration script to convert existing data:
    ```typescript
    // Migration script example
    const configs = await this.issuanceConfigRepo.find();
    for (const config of configs) {
        let newAuthConfig: AuthenticationConfig;

        if (config.authentication === 'none') {
            newAuthConfig = { method: 'none' };
        } else if (config.authentication === 'auth') {
            newAuthConfig = {
                method: 'auth',
                config: { authUrl: config.authUrl! },
            };
        } else if (config.authentication === 'presentationDuringIssuance') {
            newAuthConfig = {
                method: 'presentationDuringIssuance',
                config: { presentation: config.presentation_during_issuance! },
            };
        }

        await this.issuanceConfigRepo.update(config.id, {
            authenticationConfig: newAuthConfig,
        });
    }
    ```
3. Update all services that use the issuance configuration
4. Remove the old fields from the entity
5. Update API documentation and examples
