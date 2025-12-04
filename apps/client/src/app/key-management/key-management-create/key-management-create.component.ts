import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { KeyImportDto } from '@eudiplo/sdk';
import { KeyManagementService } from '../key-management.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from '../../utils/editor/editor.component';
import { jwkSchema } from '../../utils/schemas';

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
    EditorComponent,
  ],
  templateUrl: './key-management-create.component.html',
  styleUrl: './key-management-create.component.scss',
})
export class KeyManagementCreateComponent {
  public form: FormGroup;
  public create = true;

  jwkSchema = jwkSchema;

  editorOptionsPem = {
    automaticLayout: true,
    language: 'pem',
  };

  constructor(
    private keyManagementService: KeyManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.create = !this.route.snapshot.params['id'];
    this.form = this.fb.group({
      id: ['', [Validators.required]],
      description: ['', [Validators.required]],
      crt: [''],
    });

    if (!this.create) {
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
          });

          // Disable non-editable fields for edit mode
          this.form.get('id')?.disable();

          // Remove required validator from privateKey and id in edit mode
          this.form.get('id')?.clearValidators();
          this.form.get('id')?.updateValueAndValidity();
        },
        (error) => {
          console.error('Error loading key:', error);
          this.snackBar.open('Failed to load key', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.form.addControl('privateKey', this.fb.control('', [Validators.required]));
    }
  }

  async onSubmit(): Promise<void> {
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
      }

      this.router.navigate(['../'], { relativeTo: this.route });
    } catch (error) {
      console.error('Error saving key:', error);
      this.snackBar.open('Failed to import key', 'Close', {
        duration: 3000,
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }
}
