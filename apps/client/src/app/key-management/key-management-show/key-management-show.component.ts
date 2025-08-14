import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { X509Certificate } from '@peculiar/x509';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CertEntity } from '../../generated';
import { KeyManagementService } from '../key-management.service';

@Component({
  selector: 'app-key-management-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './key-management-show.component.html',
  styleUrl: './key-management-show.component.scss',
})
export class KeyManagementShowComponent implements OnInit {
  key?: CertEntity;
  certificateInfo?: {
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
  };

  constructor(
    private keyManagementService: KeyManagementService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadKey();
  }

  private loadKey(): void {
    const keyId = this.route.snapshot.paramMap.get('id');
    if (keyId) {
      this.keyManagementService.getKey(keyId).then(
        (key) => {
          this.key = key;
          if (key?.crt) {
            this.parseCertificateInfo(key.crt);
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

  private async parseCertificateInfo(pemCert: string): Promise<void> {
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

      console.log(cert);

      this.certificateInfo = {
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
      };
    } catch (error) {
      console.warn('Could not parse certificate:', error);
      this.certificateInfo = {
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
      };
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
  copyCertificateToClipboard(): void {
    if (this.key?.crt) {
      navigator.clipboard
        .writeText(this.key.crt)
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
