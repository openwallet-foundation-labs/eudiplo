import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  certControllerAddCertificate,
  certControllerGetCertificate,
  certControllerUpdateCertificate,
  CertUsageEntity,
  keyControllerGetKeys,
  KeyEntity,
} from '@eudiplo/sdk-angular';
import { MatSelectModule } from '@angular/material/select';
import { EditorComponent } from '../../utils/editor/editor.component';

@Component({
  selector: 'app-certificate-edit',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    MatSelectModule,
    EditorComponent,
    RouterModule,
  ],
  templateUrl: './certificate-edit.component.html',
  styleUrl: './certificate-edit.component.scss',
})
export class CertificateEditComponent implements OnInit {
  keyId?: string;
  certId?: string | null;
  form!: FormGroup;

  /** Available keys for selection in standalone mode */
  availableKeys: KeyEntity[] = [];
  /** Whether the component is in standalone mode (no keyId from route) */
  isStandaloneMode = false;

  editorOptionsPem = {
    automaticLayout: true,
    language: 'pem',
  };

  certUsages = [
    'access',
    'signing',
    'trustList',
    'statusList',
  ] as const satisfies readonly CertUsageEntity['usage'][];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Check for keyId from route param (key-scoped mode) or query param (deep link to standalone)
    this.keyId = this.route.snapshot.paramMap.get('keyId') ?? undefined;
    this.certId = this.route.snapshot.paramMap.get('certId');

    // Check if we have a keyId query param (for deep linking to standalone mode with pre-selected key)
    const queryKeyId = this.route.snapshot.queryParams['keyId'];
    if (queryKeyId && !this.keyId) {
      this.keyId = queryKeyId;
    }

    // Determine if we're in standalone mode (no keyId from route)
    this.isStandaloneMode = !this.route.snapshot.paramMap.get('keyId');

    // Initialize form with optional keyId field for standalone mode
    this.form = new FormGroup({
      keyId: new FormControl(this.keyId || ''),
      certUsageTypes: new FormControl([], Validators.required),
      description: new FormControl(),
      crt: new FormControl(),
      subjectName: new FormControl(''),
    });

    // Load available keys if in standalone mode
    if (this.isStandaloneMode) {
      this.loadAvailableKeys();
    }

    this.loadCertificate();
  }

  private async loadAvailableKeys(): Promise<void> {
    try {
      const response = await keyControllerGetKeys({});
      this.availableKeys = response.data ?? [];

      if (this.availableKeys.length === 0) {
        this.snackBar.open('No keys available. Please create a key first.', 'Close', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
      this.snackBar.open('Failed to load available keys', 'Close', {
        duration: 3000,
      });
    }
  }

  private async loadCertificate(): Promise<void> {
    if (!this.certId) {
      return;
    }
    try {
      // Load the certificate to edit
      const response = await certControllerGetCertificate({
        path: { certId: this.certId },
      });

      if (!response.data) {
        throw new Error('Certificate not found');
      }

      const cert = response.data;

      // Get keyId from certificate if not already set from route
      if (!this.keyId && cert.keyId) {
        this.keyId = cert.keyId;
      }

      // Initialize form with current values
      this.form.patchValue({
        certUsageTypes: cert.usages.map((usage) => usage.usage) || [],
        description: cert.description,
      });
    } catch (error) {
      console.error('Failed to load certificate:', error);
      this.snackBar.open('Failed to load certificate', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/certificates']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.snackBar.open(
        'Please fill in all required fields and select at least one usage type',
        'Close',
        {
          duration: 3000,
        }
      );
      return;
    }

    const formValue = this.form.value;

    // Use keyId from form (standalone mode) or from route (key-scoped mode)
    const targetKeyId = this.isStandaloneMode ? formValue.keyId : this.keyId;

    try {
      if (this.certId) {
        // Note: The API types incorrectly require 'usages' due to inheritance in the DTO,
        // but the backend only uses certUsageTypes and description
        await certControllerUpdateCertificate({
          path: { certId: this.certId },
          body: {
            certUsageTypes: formValue.certUsageTypes,
            description: formValue.description,
          } as any,
        });

        this.snackBar.open('Certificate updated successfully', 'Close', {
          duration: 3000,
        });
      } else {
        this.certId = await certControllerAddCertificate({
          body: {
            certUsageTypes: formValue.certUsageTypes,
            description: formValue.description,
            crt: formValue.crt,
            keyId: targetKeyId,
            subjectName: formValue.subjectName || undefined,
          },
        }).then((res) => res.data.id);

        this.snackBar.open('Certificate created successfully', 'Close', {
          duration: 3000,
        });
      }

      // Navigate back to the certificate detail page
      this.router.navigate(['/keys', targetKeyId, 'certificate', this.certId]);
    } catch (error: any) {
      console.error('Failed to save certificate:', error);
      this.snackBar.open(error?.message || 'Failed to save certificate', 'Close', {
        duration: 5000,
      });
    }
  }

  onCancel(): void {
    if (this.isStandaloneMode) {
      this.router.navigate(['/certificates']);
    } else if (this.certId) {
      this.router.navigate(['/keys', this.keyId, 'certificate', this.certId]);
    } else {
      this.router.navigate(['/keys', this.keyId]);
    }
  }
}
