import { Injectable } from '@angular/core';
import {
  type KeyChainCreateDto,
  type KeyChainResponseDto,
  type KeyChainUpdateDto,
  keyChainControllerCreate,
  keyChainControllerDelete,
  keyChainControllerGetAll,
  keyChainControllerGetById,
  keyChainControllerRotate,
  keyChainControllerUpdate,
} from '@eudiplo/sdk-core';

interface JWKwithKey extends JsonWebKey {
  kid?: string;
  alg: string;
}

/**
 * @deprecated Use KeyChainService instead.
 * This service is a facade that delegates to the new unified key chain API.
 */
@Injectable({
  providedIn: 'root',
})
export class KeyManagementService {
  /**
   * Generate a new key with the webcrypto API.
   * Note: In the new model, keys are generated server-side during key chain creation.
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
   * Load all key chains for the current tenant.
   */
  loadKeys(): Promise<KeyChainResponseDto[]> {
    return keyChainControllerGetAll().then(
      (response) => (response.data as KeyChainResponseDto[]) || []
    );
  }

  /**
   * Get a single key chain by ID.
   */
  getKey(id: string): Promise<KeyChainResponseDto> {
    return keyChainControllerGetById({ path: { id } }).then(
      (response) => response.data as KeyChainResponseDto
    );
  }

  /**
   * Create a new key chain.
   */
  async createKeyChain(data: KeyChainCreateDto): Promise<{ id: string }> {
    const response = await keyChainControllerCreate({ body: data });
    return response.data as { id: string };
  }

  /**
   * Update a key chain.
   */
  updateKey(keyId: string, keyData: KeyChainUpdateDto): Promise<void> {
    return keyChainControllerUpdate({ body: keyData, path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to update key:', error);
        throw new Error('Failed to update key');
      });
  }

  /**
   * Delete a key chain.
   */
  deleteKey(keyId: string): Promise<void> {
    return keyChainControllerDelete({ path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to delete key:', error);
        throw new Error('Failed to delete key');
      });
  }

  /**
   * Manually trigger key rotation for a key chain.
   * Generates new key material and a new certificate.
   */
  rotateKey(keyId: string): Promise<void> {
    return keyChainControllerRotate({ path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to rotate key:', error);
        throw new Error('Failed to rotate key');
      });
  }
}
