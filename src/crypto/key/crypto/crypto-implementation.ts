type KeyPair = {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
};

type Signer = (data: string) => Promise<string>;

type Verifier = (data: string, signature: string) => Promise<boolean>;

/**
 * Generic interface to imeplement different algorithms.
 */
export interface CryptoImplementation {
  //name of the algorithm
  alg: string;
  /**
   * Generates a new keypair
   */
  generateKeyPair(): Promise<KeyPair>;
  /**
   * creates a signer based on the passed key.
   * @param privateKeyJWK
   */
  getSigner(privateKeyJWK: JsonWebKey): Promise<Signer>;
  /**
   * creates a verifier based on the passed key.
   * @param publicKeyJWK
   */
  getVerifier(publicKeyJWK: JsonWebKey): Promise<Verifier>;
}
