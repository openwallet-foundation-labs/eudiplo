import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StoredCredential {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  presentationId: string;
}

const STORAGE_KEY = 'verifier_credential';

@Injectable({
  providedIn: 'root',
})
export class CredentialsService {
  private credentialSubject = new BehaviorSubject<StoredCredential | null>(null);
  public credential$ = this.credentialSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Import credential configuration from file
   */
  importFromFile(file: File): Promise<StoredCredential> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.setCredential(data);
          resolve(data);
        } catch (err) {
          reject(new Error(`Failed to parse credential file: ${err}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Set credential configuration
   */
  setCredential(data: any): void {
    // Validate required fields
    if (!data.endpoint || !data.clientId || !data.clientSecret || !data.presentationId) {
      throw new Error('Missing required fields: endpoint, clientId, clientSecret, and presentationId');
    }

    const credential: StoredCredential = {
      endpoint: data.endpoint,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      presentationId: data.presentationId,
    };

    this.credentialSubject.next(credential);
    this.saveToStorage(credential);
  }

  /**
   * Remove credential configuration
   */
  removeCredential(): void {
    this.credentialSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get current credential configuration
   */
  getCredential(): StoredCredential | null {
    return this.credentialSubject.value;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        this.credentialSubject.next(JSON.parse(stored));
      } else if (this.hasEnvironmentConfig()) {
        // Auto-populate from environment in development
        const credential: StoredCredential = {
          endpoint: environment.url,
          clientId: environment.clientId,
          clientSecret: environment.clientSecret,
          presentationId: environment.presentationId,
        };
        this.credentialSubject.next(credential);
        this.saveToStorage(credential);
      }
    } catch (err) {
      console.warn('Failed to load credential from storage:', err);
    }
  }

  private saveToStorage(credential: StoredCredential): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
    } catch (err) {
      console.warn('Failed to save credential to storage:', err);
    }
  }

  private hasEnvironmentConfig(): boolean {
    return !!(
      environment.url &&
      environment.clientId &&
      environment.clientSecret &&
      environment.presentationId
    );
  }
}
