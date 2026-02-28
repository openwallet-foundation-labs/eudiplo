import { Injectable } from '@angular/core';
import {
  type KeyImportDto,
  UpdateKeyDto,
  keyControllerAddKey,
  keyControllerDeleteKey,
  keyControllerGetKey,
  keyControllerGetKeys,
  keyControllerUpdateKey,
  keyControllerGetProviders,
  keyControllerGenerateKey,
  type KmsProviderInfoDto,
} from '@eudiplo/sdk-core';

interface JWKwithKey extends JsonWebKey {
  kid?: string;
  alg: string;
}

export interface KmsProvidersResponse {
  providers: KmsProviderInfoDto[];
  default: string;
}

@Injectable({
  providedIn: 'root',
})
export class KeyManagementService {
  /**
   * Generate a new key with the webcrypto API.
   */
  generateKey() {
    return window.crypto.subtle
      .generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
      )
      .then((keyPair) => window.crypto.subtle.exportKey('jwk', keyPair.privateKey))
      .then((jwk) => {
        const jwkWithAlg = jwk as JWKwithKey;
        // Remove kid if present - server will generate it
        delete jwkWithAlg.kid;
        jwkWithAlg.alg = 'ES256';
        return jwk;
      });
  }

  /**
   * Fetch available KMS providers from the server.
   */
  getProviders() {
    return keyControllerGetProviders().then((res) => res.data);
  }

  /**
   * Generate a key on the server (for providers that don't support importing).
   */
  async generateKeyOnServer(options: {
    kmsProvider?: string;
    description?: string;
  }): Promise<{ id: string }> {
    const response = await keyControllerGenerateKey({ body: options });
    return response.data as { id: string };
  }

  loadKeys() {
    return keyControllerGetKeys().then((response) => response.data || []);
  }

  getKey(id: string) {
    return keyControllerGetKey({ path: { id } }).then((response) => response.data);
  }

  async importKey(keyData: KeyImportDto): Promise<{ id: string }> {
    try {
      const response = await keyControllerAddKey({ body: keyData });
      return response.data as { id: string };
    } catch (error) {
      console.error('Failed to import key:', error);
      throw new Error('Failed to import key', { cause: error });
    }
  }

  updateKey(keyId: string, keyData: UpdateKeyDto): Promise<void> {
    return keyControllerUpdateKey({ body: keyData, path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to update key:', error);
        throw new Error('Failed to update key');
      });
  }

  deleteKey(keyId: string): Promise<void> {
    return keyControllerDeleteKey({ path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to delete key:', error);
        throw new Error('Failed to delete key');
      });
  }
}
