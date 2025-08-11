import { EC_Public } from '../../../well-known/dto/jwks-response.dto';

/**
 * Represents a key entity with its unique identifier, public key, and certificate.
 */

export class KeyObj {
    /**
     * Unique identifier for the key.
     */
    id: string;
    /**
     * Public key in JWK format.
     */
    publicKey: EC_Public;
    /**
     * Certificate in PEM format.
     */
    crt: string;
}
