import { Injectable } from '@angular/core';
import {
  type CertEntity,
  type KeyImportDto,
  UpdateKeyDto,
  keyControllerAddKey,
  keyControllerDeleteKey,
  keyControllerGetKey,
  keyControllerGetKeys,
  keyControllerUpdateKey,
} from '../generated';
import { client } from '../generated/client.gen';

@Injectable({
  providedIn: 'root',
})
export class KeyManagementService {
  loadKeys(): Promise<CertEntity[]> {
    return keyControllerGetKeys({ client }).then((response) => response.data || []);
  }

  getKey(id: string) {
    return keyControllerGetKey({ client, path: { id } }).then((response) => response.data);
  }

  importKey(keyData: KeyImportDto): Promise<void> {
    return keyControllerAddKey({ client, body: keyData })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to import key:', error);
        throw new Error('Failed to import key');
      });
  }

  updateKey(keyId: string, keyData: UpdateKeyDto): Promise<void> {
    return keyControllerUpdateKey({ client, body: keyData, path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to update key:', error);
        throw new Error('Failed to update key');
      });
  }

  deleteKey(keyId: string): Promise<void> {
    return keyControllerDeleteKey({ client, path: { id: keyId } })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to delete key:', error);
        throw new Error('Failed to delete key');
      });
  }
}
