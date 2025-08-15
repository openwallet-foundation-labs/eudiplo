import { JWK_EC_Public } from "jose";

/**
 * Represents a JSON Web Key (JWK) for an Elliptic Curve (EC) public key.
 * This class is used to define the structure of EC public keys in JWK format.
 */
export class EC_Public implements JWK_EC_Public {
    /**
     * The key type, which is always 'EC' for Elliptic Curve keys.
     */
    kty: "EC";
    /**
     * The algorithm intended for use with the key, such as 'ES256'.
     */
    crv: string;
    /**
     * The x coordinate of the EC public key.
     */
    x: string;
    /**
     * The y coordinate of the EC public key.
     */
    y: string;
}

/**
 * Represents a JSON Web Key Set (JWKS) response containing an array of EC public keys.
 */
export class JwksResponseDto {
    /**
     * An array of EC public keys in JWK format.
     */
    keys: Array<EC_Public>;
}
