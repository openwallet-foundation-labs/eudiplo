/**
 * Represents the metadata for a credential issuer.
 */
export class CredentialIssuerMetadataDto {
  /**
   * The issuer identifier, typically a URL.
   */
  credential_issuer: string;
  /**
   * List of authorization servers that support the credential issuer.
   */
  authorization_servers: string[];
  /**
   * The URL of the credential issuance endpoint.
   */
  credential_endpoint: string;
  /**
   * The URL of the notification endpoint for credential issuance.
   */
  notification_endpoint: string;
  /**
   * Information about batch credential issuance.
   */
  batch_credential_issuance: {
    /**
     * Amount of elements in a batch.
     */
    batch_size: number;
  };
  /**
   * Display information for the credentials that are getting issued.
   */
  display: Array<any>;
  /**
   * Object of credentials configurations supported by the issuer.
   */
  credential_configurations_supported: any;
  /**
   * The URL of the preferred authorization server.
   */
  authorization_server: string;
}
