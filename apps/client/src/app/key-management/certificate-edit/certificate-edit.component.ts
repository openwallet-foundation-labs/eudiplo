import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { certControllerGetCertificate, certControllerUpdateCertificate } from '@eudiplo/sdk';

@Component({
  selector: 'app-certificate-edit',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
  ],
  templateUrl: './certificate-edit.component.html',
  styleUrl: './certificate-edit.component.scss',
})
export class CertificateEditComponent implements OnInit {
  keyId!: string;
  certId!: string;
  form!: FormGroup;
  isCurrentlyAccessCert = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    this.keyId = this.route.snapshot.paramMap.get('keyId')!;
    this.certId = this.route.snapshot.paramMap.get('certId')!;

    if (!this.keyId || !this.certId) {
      this.snackBar.open('Invalid certificate or key ID', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/certificates']);
      return;
    }

    await this.loadCertificate();
  }

  private atLeastOneTypeValidator(group: FormGroup) {
    const signing = group.get('signing')?.value;
    const access = group.get('access')?.value;
    return signing || access ? null : { atLeastOneType: true };
  }

  private async loadCertificate(): Promise<void> {
    try {
      // Load the certificate to edit
      const response = await certControllerGetCertificate({
        path: { certId: this.certId },
      });

      if (!response.data) {
        throw new Error('Certificate not found');
      }

      const cert = response.data;
      const types = Array.isArray(cert.type) ? cert.type : [cert.type];
      this.isCurrentlyAccessCert = types.includes('access');

      // Initialize form with current values
      this.form = this.fb.group(
        {
          signing: [types.includes('signing')],
          access: [this.isCurrentlyAccessCert],
          description: [cert.description || ''],
        },
        { validators: this.atLeastOneTypeValidator }
      );
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
    const types: string[] = [];

    if (formValue.signing) types.push('signing');
    if (formValue.access) types.push('access');

    if (types.length === 0) {
      this.snackBar.open('Please select at least one usage type', 'Close', {
        duration: 3000,
      });
      return;
    }

    try {
      await certControllerUpdateCertificate({
        path: { certId: this.certId },
        body: {
          type: types as ('access' | 'signing')[],
          description: formValue.description || undefined,
        },
      });

      this.snackBar.open('Certificate updated successfully', 'Close', {
        duration: 3000,
      });

      // Navigate back to the certificate detail page
      this.router.navigate(['/key-management', this.keyId, 'certificate', this.certId]);
    } catch (error: any) {
      console.error('Failed to update certificate:', error);
      this.snackBar.open(error?.message || 'Failed to update certificate', 'Close', {
        duration: 5000,
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/key-management', this.keyId, 'certificate', this.certId]);
  }
}
