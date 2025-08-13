import { Injectable } from '@angular/core';
import {
  type CertEntity,
  type KeyImportDto,
  keyControllerAddKey,
  keyControllerDeleteKey,
  keyControllerGetKeys,
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
    return this.loadKeys().then((keys) => keys.find((key) => key.id === id));
  }

  importKey(keyData: KeyImportDto): Promise<void> {
    return keyControllerAddKey({ client, body: keyData })
      .then(() => undefined)
      .catch((error) => {
        console.error('Failed to import key:', error);
        throw new Error('Failed to import key');
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
