import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface StoredCredential {
  id: string;
  name: string;
  format: string;
  issuer?: string;
  uploadedAt: number;
  rawData: any;
}

export interface CredentialType {
  id: string;
  format: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CredentialsService {
  private credentialsSubject = new BehaviorSubject<StoredCredential[]>([]);
  public credentials$ = this.credentialsSubject.asObservable();

  private selectedCredentialTypesSubject = new BehaviorSubject<CredentialType[]>([]);
  public selectedCredentialTypes$ = this.selectedCredentialTypesSubject.asObservable();

  constructor() {
    this.loadCredentialsFromStorage();
  }

  /**
   * Add a credential from imported file
   */
  addCredential(file: File): Promise<StoredCredential> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const credential: StoredCredential = {
            id: this.generateId(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            format: this.detectCredentialFormat(data),
            issuer: data.issuer || data.iss || 'Unknown',
            uploadedAt: Date.now(),
            rawData: data,
          };
          const creds = this.credentialsSubject.value;
          creds.push(credential);
          this.credentialsSubject.next(creds);
          this.saveCredentialsToStorage(creds);
          resolve(credential);
        } catch (err) {
          reject(new Error(`Failed to parse credential file: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Remove a credential
   */
  removeCredential(id: string): void {
    const creds = this.credentialsSubject.value.filter((c) => c.id !== id);
    this.credentialsSubject.next(creds);
    this.saveCredentialsToStorage(creds);
  }

  /**
   * Get all credentials
   */
  getCredentials(): StoredCredential[] {
    return this.credentialsSubject.value;
  }

  /**
   * Set required credential types for presentation
   */
  setRequiredCredentialTypes(types: CredentialType[]): void {
    this.selectedCredentialTypesSubject.next(types);
    this.saveSelectedTypesToStorage(types);
  }

  /**
   * Get selected credential types
   */
  getSelectedCredentialTypes(): CredentialType[] {
    return this.selectedCredentialTypesSubject.value;
  }

  /**
   * Check if credentials match the required types
   */
  validateCredentialsAgainstRequirements(requiredTypes: CredentialType[]): boolean {
    const credentials = this.getCredentials();
    if (requiredTypes.length === 0) return credentials.length > 0;

    return requiredTypes.every((required) =>
      credentials.some((cred) => cred.format === required.format)
    );
  }

  private detectCredentialFormat(data: any): string {
    if (data.type && Array.isArray(data.type)) {
      return data.type.join(', ');
    }
    if (data.vc_type) return data.vc_type;
    if (data.format) return data.format;
    return 'Unknown';
  }

  private generateId(): string {
    return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadCredentialsFromStorage(): void {
    try {
      const stored = localStorage.getItem('verifier_credentials');
      const selectedTypes = localStorage.getItem('verifier_selected_types');

      if (stored) {
        this.credentialsSubject.next(JSON.parse(stored));
      }
      if (selectedTypes) {
        this.selectedCredentialTypesSubject.next(JSON.parse(selectedTypes));
      }
    } catch (err) {
      console.warn('Failed to load credentials from storage:', err);
    }
  }

  private saveCredentialsToStorage(creds: StoredCredential[]): void {
    try {
      localStorage.setItem('verifier_credentials', JSON.stringify(creds));
    } catch (err) {
      console.warn('Failed to save credentials to storage:', err);
    }
  }

  private saveSelectedTypesToStorage(types: CredentialType[]): void {
    try {
      localStorage.setItem('verifier_selected_types', JSON.stringify(types));
    } catch (err) {
      console.warn('Failed to save selected types to storage:', err);
    }
  }
}
