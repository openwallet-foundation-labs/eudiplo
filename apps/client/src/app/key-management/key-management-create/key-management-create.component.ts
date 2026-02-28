import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeyManagementService } from '../key-management.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from '../../utils/editor/editor.component';
import { jwkSchema } from '../../utils/schemas';
import { KeyImportDto, KmsProvidersResponseDto, KmsProviderInfoDto } from '@eudiplo/sdk-core';
import { v4 } from 'uuid';
import { KeyDownloadDialogComponent } from './key-download-dialog/key-download-dialog.component';

@Component({
  selector: 'app-key-management-create',
  imports: [
    CommonModule,
    ClipboardModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
    MonacoEditorModule,
    EditorComponent,
  ],
  templateUrl: './key-management-create.component.html',
  styleUrl: './key-management-create.component.scss',
})
export class KeyManagementCreateComponent implements OnInit {
  public form: FormGroup;
  public keyId?: string;
  public kmsProviders: KmsProviderInfoDto[] = [];
  public kmsDefault = 'db';
  public selectedProviderCanImport = true;

  jwkSchema = jwkSchema;

  constructor(
    private readonly keyManagementService: KeyManagementService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog
  ) {
    this.keyId = this.route.snapshot.params['id'];
    this.form = this.fb.group({
      description: [''],
      kmsProvider: [''],
    });

    // React to provider changes
    this.form.get('kmsProvider')?.valueChanges.subscribe((providerName: string) => {
      this.updateProviderCapabilities(providerName);
    });
  }
  ngOnInit(): void {
    // Load available KMS providers
    this.keyManagementService.getProviders().then(
      (response: KmsProvidersResponseDto) => {
        this.kmsProviders = response.providers;
        this.kmsDefault = response.default;
        if (!this.keyId) {
          this.form.get('kmsProvider')?.setValue(this.kmsDefault);
          this.updateProviderCapabilities(this.kmsDefault);
        }
      },
      (error) => {
        console.error('Error loading KMS providers:', error);
      }
    );

    if (this.keyId) {
      this.keyManagementService.getKey(this.route.snapshot.params['id']).then(
        (key: any) => {
          if (!key) {
            this.snackBar.open('Key not found', 'Close', { duration: 3000 });
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          this.form.patchValue({
            description: key.description,
          });
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

  /**
   * Update capability flags based on the selected provider.
   */
  updateProviderCapabilities(providerName: string) {
    const provider = this.kmsProviders.find((p) => p.name === providerName);
    this.selectedProviderCanImport = provider?.capabilities?.canImport ?? true;

    if (!this.keyId) {
      if (this.selectedProviderCanImport) {
        // Ensure the privateKey control exists
        if (!this.form.get('privateKey')) {
          this.form.addControl('privateKey', this.fb.control('', [Validators.required]));
        }
      } else {
        // Remove the privateKey control — server will generate the key
        this.form.removeControl('privateKey');
      }
    }
  }

  generateKey() {
    this.keyManagementService.generateKey().then((jwk: JsonWebKey) => {
      delete jwk.ext;
      delete jwk.key_ops;
      this.form.get('privateKey')?.setValue(JSON.stringify(jwk, null, 2));
      this.snackBar.open('Key generated successfully', 'Close', {
        duration: 3000,
      });
    });
  }

  async onSubmit(): Promise<void> {
    try {
      if (this.keyId) {
        // For edit mode, update key description
        const updateData: any = {
          description: this.form.get('description')?.value,
        };

        await this.keyManagementService.updateKey(this.route.snapshot.params['id'], updateData);
        this.snackBar.open('Key updated successfully', 'Close', {
          duration: 3000,
        });

        this.router.navigate(['../'], { relativeTo: this.route });
      } else if (!this.selectedProviderCanImport) {
        // Provider does not support importing — generate key on the server
        const result = await this.keyManagementService.generateKeyOnServer({
          kmsProvider: this.form.value.kmsProvider || undefined,
          description: this.form.value.description || undefined,
        });
        this.snackBar.open('Key generated successfully', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['/keys', result.id]);
      } else {
        // Parse and validate the private key
        let privateKey: any;
        try {
          privateKey = JSON.parse(this.form.value.privateKey);
        } catch {
          this.snackBar.open('Invalid JSON format for private key', 'Close', {
            duration: 3000,
          });
          return;
        }

        // Remove kid if present - server will generate it
        delete privateKey.kid;

        const keyImportDto: KeyImportDto = {
          id: v4(),
          key: privateKey,
          description: this.form.value.description,
          kmsProvider: this.form.value.kmsProvider || undefined,
        };

        const result = await this.keyManagementService.importKey(keyImportDto);
        this.snackBar.open('Key imported successfully', 'Close', {
          duration: 3000,
        });

        // Show dialog to download the key configuration
        const dialogRef = this.dialog.open(KeyDownloadDialogComponent, {
          data: {
            keyConfig: {
              id: result.id,
              key: privateKey,
              description: this.form.value.description,
            },
          },
          disableClose: true,
        });

        // Navigate to the created key's detail page after dialog is closed
        dialogRef.afterClosed().subscribe(() => {
          this.router.navigate(['/keys', result.id]);
        });
      }
    } catch (error) {
      console.error('Error saving key:', error);
      this.snackBar.open('Failed to save key', 'Close', {
        duration: 3000,
      });
    }
  }
}
