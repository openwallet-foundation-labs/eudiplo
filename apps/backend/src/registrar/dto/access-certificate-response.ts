/**
 * Repsonse of access certificate request.
 */
export interface AccessCertificateResponse {
    /**
     * Unique identifier of the access certificate.
     */
    id: string;
    /**
     * The public key in PEM format.
     */
    crt: string;
    /**
     * Indicates if the access certificate is revoked.
     */
    revoked?: boolean;
}
