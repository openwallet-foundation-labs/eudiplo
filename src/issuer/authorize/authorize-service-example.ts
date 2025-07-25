// Example of how to update the AuthorizeService to work with the new AuthenticationConfig

import { AuthenticationConfigHelper } from '../issuance/dto/authentication-config.helper';

// In the authorizationChallengeEndpoint method, replace the current logic:
async authorizationChallengeEndpoint(
    res: Response<any, Record<string, any>>,
    body: AuthorizeQueries,
    tenantId: string,
) {
    // auth session and issuer state have the same value
    if (body.auth_session) {
        const session = await this.sessionService.get(body.auth_session);
        if (!session) {
            throw new ConflictException(
                'auth_session not found or not provided in the request',
            );
        }
        // Check if session has valid presentation
        await this.sendAuthorizationCode(res, body.auth_session, tenantId);
        return;
    }

    const session = await this.sessionService.get(body.issuer_state!);
    if (!session) {
        throw new Error('Credential offer not found');
    }
    
    const issuanceId = session.issuanceId!;
    const config = await this.issuanceService.getIssuanceConfigurationById(
        issuanceId,
        tenantId,
    );

    // Use the new authentication configuration structure
    const { authenticationConfig } = config;

    switch (authenticationConfig.method) {
        case 'none':
            // No authentication required, proceed directly
            await this.sendAuthorizationCode(res, body.issuer_state!, tenantId);
            break;

        case 'auth':
            // External authentication required
            const authUrl = authenticationConfig.config.authUrl;
            const webhook = authenticationConfig.config.webhook;
            
            res.status(401).send({
                error: 'authentication_required',
                auth_url: authUrl,
                auth_session: body.issuer_state,
                error_description: 'Authentication required before issuance',
            });
            break;

        case 'presentationDuringIssuance':
            // Presentation during issuance required
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
            throw new Error(`Unknown authentication method: ${(authenticationConfig as any).method}`);
    }
}

// Helper methods for type-safe access
private getAuthUrl(config: IssuanceConfig): string | null {
    return AuthenticationConfigHelper.getAuthUrl(config.authenticationConfig);
}

private getPresentationConfig(config: IssuanceConfig): any | null {
    return AuthenticationConfigHelper.getPresentationConfig(config.authenticationConfig);
}

private requiresAuthentication(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method !== 'none';
}

private requiresPresentation(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method === 'presentationDuringIssuance';
}

private requiresExternalAuth(config: IssuanceConfig): boolean {
    return config.authenticationConfig.method === 'auth';
}
