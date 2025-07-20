import { JWK } from 'jose';

/**
 * Interface representing the issuer metadata.
 */
export interface IssuerMetadata {
    /**
     * The issuer identifier, typically a URL.
     */
    issuer: string;
    /**
     * The JSON Web Key Set (JWKS) containing the public keys for the issuer.
     */
    jwks: {
        /**
         * List of keys in the JWKS.
         */
        keys: JWK[];
    };
}
