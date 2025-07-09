export class CredentialIssuerMetadataDto {
    credential_issuer: string;
    authorization_servers: string[];
    credential_endpoint: string;
    notification_endpoint: string;
    batch_credential_issuance: {
        batch_size: number;
    };
    display: Array<any>;
    credential_configurations_supported: any;
    authorization_server: string;
}
