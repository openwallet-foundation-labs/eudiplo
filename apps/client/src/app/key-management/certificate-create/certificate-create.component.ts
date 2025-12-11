import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { certControllerAddCertificate, certControllerAddSelfSignedCert } from '@eudiplo/sdk';
import { v4 } from 'uuid';

type CertificateType = 'signing' | 'access';

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
  ],
  templateUrl: './certificate-create.component.html',
  styleUrl: './certificate-create.component.scss',
})
export class CertificateCreateComponent implements OnInit {
  keyId!: string;
  form!: FormGroup;

  editorOptionsPem = {
    automaticLayout: true,
    language: 'pem',
    minimap: { enabled: false },
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    // Get keyId from query params
    this.keyId = this.route.snapshot.queryParams['keyId'];

    if (!this.keyId) {
      this.snackBar.open('No key selected. Please select a key first.', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['/key-management']);
      return;
    }

    // Initialize form
    this.form = this.fb.group(
      {
        crt: ['', Validators.required],
        signing: [false],
        access: [false],
        description: [''],
      },
      { validators: this.atLeastOneTypeValidator }
    );
  }

  private atLeastOneTypeValidator(group: FormGroup) {
    const signing = group.get('signing')?.value;
    const access = group.get('access')?.value;
    return signing || access ? null : { atLeastOneType: true };
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
    const types: CertificateType[] = [];

    if (formValue.signing) types.push('signing');
    if (formValue.access) types.push('access');

    if (types.length === 0) {
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
          type: types,
          description: formValue.description || undefined,
        },
      });

      this.snackBar.open('Certificate added successfully', 'Close', {
        duration: 3000,
      });

      // Navigate back to the key detail page
      this.router.navigate(['/key-management', this.keyId]);
    } catch (error: any) {
      console.error('Failed to add certificate:', error);
      this.snackBar.open(error?.message || 'Failed to add certificate', 'Close', {
        duration: 5000,
      });
    }
  }

  async generateSelfSignedCert(types: CertificateType[]): Promise<void> {
    try {
      const response = await certControllerAddSelfSignedCert({
        body: {
          keyId: this.keyId,
          type: types,
        },
      });

      this.snackBar.open('Self-signed certificate generated successfully', 'Close', {
        duration: 3000,
      });

      // Navigate back to the key detail page
      this.router.navigate(['/key-management', this.keyId, 'certificate', response.data.id]);
    } catch (error: any) {
      console.error('Failed to generate certificate:', error);
      this.snackBar.open(error?.message || 'Failed to generate certificate', 'Close', {
        duration: 5000,
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/key-management', this.keyId]);
  }
}
