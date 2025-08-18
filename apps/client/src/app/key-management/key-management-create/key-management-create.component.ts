import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  type FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeyImportDto } from '../../generated';
import { KeyManagementService } from '../key-management.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'app-key-management-create',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
    MatDivider,
    MonacoEditorModule,
  ],
  templateUrl: './key-management-create.component.html',
  styleUrl: './key-management-create.component.scss',
})
export class KeyManagementCreateComponent {
  public form: FormGroup;
  public create = true;
  public loading = false;

  editorOptions = {
    language: 'json',
    automaticLayout: true,
  };

  editorOptionsPem = {
    automaticLayout: true,
  };

  constructor(
    private keyManagementService: KeyManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      id: ['', [Validators.required]],
      description: ['', [Validators.required]],
      privateKey: ['', [Validators.required, this.keyValidator]],
      crt: [''],
    });

    if (this.route.snapshot.params['id']) {
      this.create = false;
      this.keyManagementService.getKey(this.route.snapshot.params['id']).then(
        (key) => {
          if (!key) {
            this.snackBar.open('Key not found', 'Close', { duration: 3000 });
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          this.form.patchValue({
            id: key.id,
            description: key.description,
            crt: key.crt,
            // privateKey is intentionally not set - it's not returned by the API for security
          });

          // Disable non-editable fields for edit mode
          this.form.get('id')?.disable();
          this.form.get('privateKey')?.disable();

          // Remove required validator from privateKey in edit mode
          this.form.get('privateKey')?.clearValidators();
          this.form.get('privateKey')?.updateValueAndValidity();
        },
        (error) => {
          console.error('Error loading key:', error);
          this.snackBar.open('Failed to load key', 'Close', { duration: 3000 });
        }
      );
    }
  }

  keyValidator(control: FormControl): Record<string, boolean> | null {
    if (!control.value) return null; // Allow empty value for optional validation

    try {
      const jwk = JSON.parse(control.value);

      // Check if it's a valid EC private JWK
      if (jwk.kty !== 'EC') {
        return { invalidJwkType: true };
      }

      // Check for required EC private key fields
      const requiredFields = ['kid', 'kty', 'x', 'y', 'crv', 'd', 'alg'];
      const missingFields = requiredFields.filter((field) => !jwk[field]);

      if (missingFields.length > 0) {
        return { missingJwkFields: true };
      }

      // Check if it's actually a private key (has 'd' parameter)
      if (!jwk.d || typeof jwk.d !== 'string' || jwk.d.trim() === '') {
        return { notPrivateKey: true };
      }

      // Validate curve is supported (common EC curves)
      const supportedCurves = ['P-256'];
      if (!supportedCurves.includes(jwk.crv)) {
        return { unsupportedCurve: true };
      }

      return null; // Valid EC private JWK
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return { invalidJson: true };
    }
  }

  async onSubmit(): Promise<void> {
    //TODO: validate certificate before submitting
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;

    try {
      if (this.create) {
        // For creating a new key, use all form values
        const keyImportDto: KeyImportDto = {
          privateKey: JSON.parse(this.form.value.privateKey),
          description: this.form.value.description,
          crt: this.form.value.crt || undefined,
        };
        await this.keyManagementService.importKey(keyImportDto);
        this.snackBar.open('Key imported successfully', 'Close', {
          duration: 3000,
        });
      } else {
        await this.keyManagementService.updateKey(
          this.route.snapshot.params['id'],
          this.form.value
        );
        this.loading = false;
      }

      this.router.navigate(['../'], { relativeTo: this.route });
    } catch (error) {
      console.error('Error saving key:', error);
      this.snackBar.open('Failed to import key', 'Close', {
        duration: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }
}
