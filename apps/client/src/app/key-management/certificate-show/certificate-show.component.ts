import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  certControllerDeleteCertificate,
  certControllerGetCertificate,
  type CertEntity,
} from '@eudiplo/sdk';
import { X509Certificate, SubjectAlternativeNameExtension } from '@peculiar/x509';

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  algorithm: string;
  publicKeyAlgorithm: string;
  keyUsage: string[];
  isExpired: boolean;
  fingerprint: string;
  sans?: string[];
}

@Component({
  selector: 'app-certificate-show',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './certificate-show.component.html',
  styleUrl: './certificate-show.component.scss',
})
export class CertificateShowComponent implements OnInit {
  certificate?: CertEntity;
  certificateInfo?: CertificateInfo;
  pemDer?: string;
  pemBase64?: string;
  keyId?: string;
  certId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.keyId = this.route.snapshot.paramMap.get('keyId') || undefined;
    this.certId = this.route.snapshot.paramMap.get('certId') || undefined;

    if (this.certId) {
      try {
        const response = await certControllerGetCertificate({
          path: { certId: this.certId },
        });
        this.certificate = response.data;

        if (this.certificate?.crt) {
          await this.parseCertificateInfo(this.certificate.crt);
        }
      } catch (error) {
        console.error('Error loading certificate:', error);
      }
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
      } catch {
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
      } catch {
        fingerprint = 'Unable to compute';
      }

      const sanExt = cert.getExtension<SubjectAlternativeNameExtension>('2.5.29.17');

      let sans: string[] = [];
      if (sanExt) {
        const names = sanExt.names;
        sans = names.items.filter((name) => name.type === 'dns').map((name) => name.value);
      }

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
        sans,
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

  navigateToKey(): void {
    if (this.keyId) {
      this.router.navigate(['/key-management', this.keyId]);
    }
  }

  navigateToCertificates(): void {
    this.router.navigate(['/certificates']);
  }

  getTypeLabel(type: string): string {
    return type === 'signing' ? 'Signing' : 'Access';
  }

  getTypeColor(type: string): 'primary' | 'accent' {
    return type === 'signing' ? 'primary' : 'accent';
  }

  async delete() {
    if (
      !confirm('Are you sure you want to delete this certificate? This action cannot be undone.')
    ) {
      return;
    }
    await certControllerDeleteCertificate({
      path: { certId: this.certId! },
    });
    this.router.navigate(['/key-management', this.keyId]);
  }

  async copyToClipboard(text: string, format: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${format} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
}
