import { Injectable } from '@angular/core';
import {
  type KeyImportDto,
  UpdateKeyDto,
  keyControllerAddKey,
  keyControllerDeleteKey,
  keyControllerGetKey,
  keyControllerGetKeys,
  keyControllerUpdateKey,
} from '@eudiplo/sdk';

@Injectable({
  providedIn: 'root',
})
export class KeyManagementService {
  loadKeys() {
    return keyControllerGetKeys().then((response) => response.data || []);
  }

  getKey(id: string) {
    return keyControllerGetKey({ path: { id } }).then((response) => response.data);
  }

  importKey(keyData: KeyImportDto): Promise<void> {
    return keyControllerAddKey({ body: keyData })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to import key:', error);
        throw new Error('Failed to import key');
      });
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
