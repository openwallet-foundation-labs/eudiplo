import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { EditorComponent } from '../../utils/editor/editor.component';
import {
  certControllerAddCertificate,
  certControllerAddSelfSignedCert,
  certControllerDeleteCertificate,
} from '@eudiplo/sdk';
import { KeyManagementService } from '../key-management.service';

@Component({
  selector: 'app-certificate-list',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    MatDivider,
    EditorComponent,
  ],
  templateUrl: './certificate-list.component.html',
  styleUrl: './certificate-list.component.scss',
})
export class CertificateListComponent implements OnInit {
  @Input() keyId?: string;
  @Input() createMode = false;
  @Input() certificatesFormArray!: FormArray;

  certificateTypes = [
    { value: 'signing', label: 'Signing' },
    { value: 'access', label: 'Access' },
  ];

  editorOptionsPem = {
    automaticLayout: true,
    language: 'pem',
  };

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private keyManagementService: KeyManagementService
  ) {}

  ngOnInit(): void {
    // Load existing certificates in edit mode
    if (!this.createMode && this.keyId) {
      this.loadCertificates();
    }
  }

  get certificatesArray(): FormArray {
    return this.certificatesFormArray;
  }

  private async loadCertificates(): Promise<void> {
    if (!this.keyId) return;

    try {
      const key = await this.keyManagementService.getKey(this.keyId);
      if (key?.certificates && Array.isArray(key.certificates)) {
        this.certificatesArray.clear();
        key.certificates.forEach((cert: any) => {
          const types = Array.isArray(cert.type) ? cert.type : [cert.type];
          this.certificatesArray.push(
            this.fb.group({
              id: [cert.id],
              crt: [{ value: cert.crt || '', disabled: true }],
              signing: [{ value: types.includes('signing'), disabled: true }],
              access: [{ value: types.includes('access'), disabled: true }],
              description: [{ value: cert.description || '', disabled: true }],
            })
          );
        });
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      this.snackBar.open('Failed to load certificates', 'Close', {
        duration: 3000,
      });
    }
  }

  async addCertificate(): Promise<void> {
    // In create mode, just add to form array
    if (this.createMode) {
      this.certificatesArray.push(
        this.fb.group({
          crt: ['', [Validators.required]],
          signing: [true],
          access: [false],
          description: [''],
        })
      );
      return;
    }

    // In edit mode, add as new certificate to be saved
    this.certificatesArray.push(
      this.fb.group({
        crt: ['', [Validators.required]],
        signing: [true],
        access: [false],
        description: [''],
        isNew: [true], // Mark as new certificate to be saved
      })
    );
  }

  async generateSelfSignedCert(types: ('signing' | 'access')[]): Promise<void> {
    if (!this.keyId) {
      this.snackBar.open('Key ID is required to generate certificate', 'Close', {
        duration: 3000,
      });
      return;
    }

    try {
      await certControllerAddSelfSignedCert({
        body: { keyId: this.keyId, type: types },
      });
      this.snackBar.open('Self-signed certificate generated successfully', 'Close', {
        duration: 3000,
      });

      // Reload certificates
      await this.loadCertificates();
    } catch (error) {
      console.error('Error generating self-signed certificate:', error);
      this.snackBar.open('Failed to generate self-signed certificate', 'Close', {
        duration: 3000,
      });
    }
  }

  async removeCertificate(index: number): Promise<void> {
    const certGroup = this.certificatesArray.at(index);
    const certId = certGroup.get('id')?.value;
    const isNew = certGroup.get('isNew')?.value;
    const wasAccessCert = certGroup.get('access')?.value === true;

    // In create mode or for new certificates, just remove from form
    if (this.createMode || isNew) {
      this.certificatesArray.removeAt(index);

      // If this was an access certificate, re-enable access checkbox on other certs
      if (wasAccessCert) {
        this.certificatesArray.controls.forEach((cert) => {
          if (!cert.get('id')?.value) {
            // Only for editable certificates
            cert.get('access')?.enable();
          }
        });
      }
      return;
    }

    // In edit mode, delete via API
    if (!this.keyId || !certId) {
      this.certificatesArray.removeAt(index);
      return;
    }

    try {
      await certControllerDeleteCertificate({
        path: { certId },
      });
      this.certificatesArray.removeAt(index);

      // If this was an access certificate, re-enable access checkbox on other certs
      if (wasAccessCert) {
        this.certificatesArray.controls.forEach((cert) => {
          if (!cert.get('id')?.value) {
            // Only for editable certificates
            cert.get('access')?.enable();
          }
        });
      }

      this.snackBar.open('Certificate deleted successfully', 'Close', {
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting certificate:', error);
      this.snackBar.open('Failed to delete certificate', 'Close', {
        duration: 3000,
      });
    }
  }

  async saveNewCertificates(): Promise<void> {
    if (this.createMode || !this.keyId) return;

    const newCerts = this.certificatesArray.controls.filter(
      (cert) => cert.get('isNew')?.value === true
    );

    for (const certControl of newCerts) {
      try {
        const types: ('signing' | 'access')[] = [];
        if (certControl.get('signing')?.value) types.push('signing');
        if (certControl.get('access')?.value) types.push('access');

        if (types.length === 0) {
          this.snackBar.open('Certificate must have at least one usage type', 'Close', {
            duration: 3000,
          });
          throw new Error('No certificate type selected');
        }

        await certControllerAddCertificate({
          body: {
            keyId: this.keyId,
            crt: certControl.get('crt')?.value,
            type: types,
            description: certControl.get('description')?.value,
          },
        });
      } catch (error) {
        console.error('Error adding certificate:', error);
        this.snackBar.open('Failed to add some certificates', 'Close', {
          duration: 3000,
        });
        throw error;
      }
    }
  }
}
