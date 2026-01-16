import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { certControllerAddCertificate } from '@eudiplo/sdk-angular';
import { v4 } from 'uuid';

@Component({
  selector: 'app-certificate-create',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatMenuModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    MatSelectModule,
  ],
  templateUrl: './certificate-create.component.html',
  styleUrl: './certificate-create.component.scss',
})
export class CertificateCreateComponent implements OnInit {
  keyId!: string;
  form!: FormGroup;
  selfSignedForm!: FormGroup;

  editorOptionsPem = {
    automaticLayout: true,
    language: 'pem',
    minimap: { enabled: false },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Get keyId from query params
    this.keyId = this.route.snapshot.queryParams['keyId'];

    if (!this.keyId) {
      this.snackBar.open('No key selected. Please select a key first.', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/keys']);
      return;
    }

    // Initialize form
    this.form = new FormGroup({
      crt: new FormControl('', Validators.required),
      certUsageTypes: new FormControl<string[]>([], Validators.required),
      description: new FormControl(''),
    });

    // Initialize self-signed form
    this.selfSignedForm = new FormGroup({
      certUsageTypes: new FormControl<string[]>([], Validators.required),
      description: new FormControl(''),
      subjectName: new FormControl(''),
    });
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

    if (!formValue.signing && !formValue.access) {
      this.snackBar.open('Please select at least one usage type', 'Close', {
        duration: 3000,
      });
      return;
    }

    try {
      await certControllerAddCertificate({
        body: {
          id: v4(),
          keyId: this.keyId,
          crt: formValue.crt,
          certUsageTypes: formValue.certUsageTypes,
          description: formValue.description || undefined,
        },
      });

      this.snackBar.open('Certificate added successfully', 'Close', {
        duration: 3000,
      });

      // Navigate back to the key detail page
      this.router.navigate(['/keys', this.keyId]);
    } catch (error: any) {
      console.error('Failed to add certificate:', error);
      this.snackBar.open(error?.message || 'Failed to add certificate', 'Close', {
        duration: 5000,
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/keys', this.keyId]);
  }

  async onGenerateSelfSigned(): Promise<void> {
    if (this.selfSignedForm.invalid) {
      this.snackBar.open('Please select at least one usage type', 'Close', {
        duration: 3000,
      });
      return;
    }

    const formValue = this.selfSignedForm.value;

    try {
      await certControllerAddCertificate({
        body: {
          id: v4(),
          keyId: this.keyId,
          certUsageTypes: formValue.certUsageTypes,
          description: formValue.description || undefined,
          subjectName: formValue.subjectName || undefined,
        },
      });

      this.snackBar.open('Self-signed certificate generated successfully', 'Close', {
        duration: 3000,
      });

      // Navigate back to the key detail page
      this.router.navigate(['/keys', this.keyId]);
    } catch (error: any) {
      console.error('Failed to generate certificate:', error);
      this.snackBar.open(error?.message || 'Failed to generate certificate', 'Close', {
        duration: 5000,
      });
    }
  }
}
