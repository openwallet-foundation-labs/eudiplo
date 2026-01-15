import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { X509Certificate, SubjectAlternativeNameExtension } from '@peculiar/x509';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeyEntity } from '@eudiplo/sdk-angular';
import { KeyManagementService } from '../key-management.service';

interface CertificateInfo {
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  serialNumber?: string;
  algorithm?: string;
  publicKeyAlgorithm?: string;
  keyUsage?: string[];
  isExpired?: boolean;
  fingerprint?: string;
  sans?: string[];
  usages?: string[];
}

@Component({
  selector: 'app-key-management-show',
  imports: [
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatTabsModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './key-management-show.component.html',
  styleUrl: './key-management-show.component.scss',
})
export class KeyManagementShowComponent implements OnInit {
  key?: KeyEntity;
  certificateInfoMap = new Map<string, CertificateInfo>();
  publicKeyPem = '';
  displayedColumns: string[] = ['id', 'types', 'description', 'status', 'actions'];

  constructor(
    private readonly keyManagementService: KeyManagementService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadKey();
  }

  private loadKey(): void {
    const keyId = this.route.snapshot.paramMap.get('id');
    if (keyId) {
      this.keyManagementService.getKey(keyId).then(
        async (key) => {
          this.key = key;
          // Compute PEM format for public key
          this.publicKeyPem = await this.computePublicKeyPem();
          // Parse all certificates if they exist
          if (key?.certificates && Array.isArray(key.certificates)) {
            key.certificates.forEach((cert) => {
              // Build usages array from boolean fields
              this.parseCertificateInfo(cert.id, cert.crt, cert.usages?.map((u) => u.usage) || []);
            });
          }
        },
        (error) => {
          this.snackBar.open('Failed to load key', 'Close', {
            duration: 3000,
          });
          console.error('Load error:', error);
        }
      );
    }
  }

  private async parseCertificateInfo(
    certId: string,
    pemCert: string,
    usages?: string[]
  ): Promise<void> {
    try {
      // Parse the PEM certificate using @peculiar/x509
      const cert = new X509Certificate(pemCert);

      // Check if certificate is expired
      const now = new Date();
      const isExpired = now > cert.notAfter;

      // Extract key usage extensions if available
      let keyUsage: string[] = [];
      try {
        const keyUsageExt = cert.getExtension('2.5.29.15'); // Key Usage OID
        if (keyUsageExt) {
          // Key usage parsing would require more detailed implementation
          keyUsage = ['Key usage extension found'];
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Key usage extension not available
        keyUsage = ['Not specified'];
      }

      // Generate certificate fingerprint (SHA-1)
      let fingerprint = '';
      try {
        const certBuffer = cert.rawData;
        await crypto.subtle.digest('SHA-1', certBuffer).then((hash) => {
          const hashArray = Array.from(new Uint8Array(hash));
          fingerprint = hashArray
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(':')
            .toUpperCase();
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        fingerprint = 'Unable to compute';
      }

      const sanExt = cert.getExtension<SubjectAlternativeNameExtension>('2.5.29.17');

      let sans: string[] = [];
      if (sanExt) {
        const names = sanExt.names;
        sans = names.items.filter((name) => name.type === 'dns').map((name) => name.value);
      }

      this.certificateInfoMap.set(certId, {
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.notBefore.toLocaleDateString() + ' ' + cert.notBefore.toLocaleTimeString(),
        validTo: cert.notAfter.toLocaleDateString() + ' ' + cert.notAfter.toLocaleTimeString(),
        serialNumber: cert.serialNumber,
        algorithm: cert.signatureAlgorithm.name,
        publicKeyAlgorithm: cert.publicKey.algorithm.name,
        keyUsage: keyUsage.length > 0 ? keyUsage : ['Not specified'],
        isExpired: isExpired,
        fingerprint: fingerprint || 'Computing...',
        sans,
        usages: usages || [],
      });
    } catch (error) {
      console.warn('Could not parse certificate:', error);
      this.certificateInfoMap.set(certId, {
        subject: 'Error parsing certificate',
        issuer: 'Certificate parsing failed',
        validFrom: 'N/A',
        validTo: 'N/A',
        serialNumber: 'N/A',
        algorithm: 'N/A',
        publicKeyAlgorithm: 'N/A',
        keyUsage: ['N/A'],
        isExpired: false,
        fingerprint: 'N/A',
        usages: usages || [],
      });
    }
  }

  // Helper method to format PEM certificate for display
  formatPemCertificate(pem: string): string {
    if (!pem) return '';

    // Ensure proper PEM formatting with line breaks
    return pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '-----BEGIN CERTIFICATE-----\n')
      .replace(/-----END CERTIFICATE-----/g, '\n-----END CERTIFICATE-----')
      .replace(/(.{64})/g, '$1\n') // Add line breaks every 64 characters
      .replace(/\n\n/g, '\n') // Remove double line breaks
      .trim();
  }

  // Helper method to copy certificate to clipboard
  copyCertificateToClipboard(pem: string): void {
    navigator.clipboard
      .writeText(pem)
      .then(() => {
        this.snackBar.open('Certificate copied to clipboard', 'Close', {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open('Failed to copy certificate', 'Close', {
          duration: 2000,
        });
      });
  }

  copyPublicKeyToClipboard(): void {
    const publicKey = this.getPublicKey();
    navigator.clipboard
      .writeText(JSON.stringify(publicKey, null, 2))
      .then(() => {
        this.snackBar.open('Public key (JWK) copied to clipboard', 'Close', {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open('Failed to copy public key', 'Close', {
          duration: 2000,
        });
      });
  }

  copyPublicKeyPemToClipboard(): void {
    navigator.clipboard
      .writeText(this.publicKeyPem)
      .then(() => {
        this.snackBar.open('Public key (PEM) copied to clipboard', 'Close', {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open('Failed to copy public key', 'Close', {
          duration: 2000,
        });
      });
  }

  getPublicKey(): any {
    if (!this.key?.key) {
      return null;
    }

    // Extract public key properties from JWK (remove private key material)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { d, p, q, dp, dq, qi, ...publicKey } = this.key.key as any;
    return publicKey;
  }

  getPublicKeyJson(): string {
    const publicKey = this.getPublicKey();
    return publicKey ? JSON.stringify(publicKey, null, 2) : 'No public key available';
  }

  async computePublicKeyPem(): Promise<string> {
    try {
      const publicKey = this.getPublicKey();
      if (!publicKey) return 'No public key available';

      // Import the JWK as a CryptoKey
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        publicKey,
        { name: 'ECDSA', namedCurve: publicKey.crv },
        true,
        ['verify']
      );

      // Export as SPKI (SubjectPublicKeyInfo) format
      const exported = await crypto.subtle.exportKey('spki', cryptoKey);

      // Convert to PEM format
      const exportedAsString = this.arrayBufferToBase64(exported);
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${exportedAsString.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

      return pemKey;
    } catch (error) {
      console.error('Failed to convert JWK to PEM:', error);
      return 'Failed to convert public key to PEM format';
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCodePoint(bytes[i]);
    }
    return btoa(binary);
  }

  deleteKey() {
    if (this.key && confirm('Are you sure you want to delete this key?')) {
      this.keyManagementService
        .deleteKey(this.key.id)
        .then(() => {
          this.snackBar.open('Key deleted successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          this.snackBar.open('Failed to delete key', 'Close', {
            duration: 3000,
          });
          console.error('Delete error:', error);
        });
    }
  }
}
