import * as crypto from 'crypto';
import { CryptoImplementation } from './crypto-implementation';

const ED25519: CryptoImplementation = {
  alg: 'EdDSA',
  async generateKeyPair() {
    const keyPair = await crypto.webcrypto.subtle.generateKey(
      {
        name: 'EdDSA',
        namedCurve: 'Ed25519',
      },
      true,
      ['sign', 'verify']
    );

    const publicKey = await crypto.webcrypto.subtle.exportKey(
      'jwk',
      keyPair.publicKey
    );
    const privateKey = await crypto.webcrypto.subtle.exportKey(
      'jwk',
      keyPair.privateKey
    );

    return { publicKey, privateKey };
  },
  async getSigner(privateKeyJWK: object) {
    const privateKey = await crypto.webcrypto.subtle.importKey(
      'jwk',
      privateKeyJWK,
      {
        name: 'EdDSA',
        namedCurve: 'Ed25519',
      },
      false,
      ['sign']
    );

    return async (data: string) => {
      const signature = await crypto.webcrypto.subtle.sign(
        'EdDSA',
        privateKey,
        new TextEncoder().encode(data)
      );

      return Buffer.from(signature).toString('base64url');
    };
  },
  async getVerifier(publicKeyJWK: object) {
    const publicKey = await crypto.webcrypto.subtle.importKey(
      'jwk',
      publicKeyJWK,
      {
        name: 'EdDSA',
        namedCurve: 'Ed25519',
      },
      false,
      ['verify']
    );

    return async (data: string, signatureBase64url: string) => {
      const signature = Buffer.from(signatureBase64url, 'base64url');
      const isVerified = await crypto.webcrypto.subtle.verify(
        'EdDSA',
        publicKey,
        signature,
        new TextEncoder().encode(data)
      );

      return isVerified;
    };
  },
};

export { ED25519 };
