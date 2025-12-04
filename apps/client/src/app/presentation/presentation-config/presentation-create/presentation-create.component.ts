import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { PresentationConfig } from '@eudiplo/sdk';
import { PresentationManagementService } from '../presentation-management.service';
import { MatDialog } from '@angular/material/dialog';
import { JsonViewDialogComponent } from '../../../issuance/credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { configs } from './pre-config';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent, extractSchema } from '../../../utils/editor/editor.component';
import { WebhookConfigEditComponent } from '../../../utils/webhook-config-edit/webhook-config-edit.component';
import {
  DCQLSchema,
  presentationConfigSchema,
  registrationCertificateRequestSchema,
} from '../../../utils/schemas';
import { CredentialIdsComponent } from '../../credential-ids/credential-ids.component';

@Component({
  selector: 'app-presentation-create',
  imports: [
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
    MatMenuModule,
    MatDividerModule,
    MonacoEditorModule,
    EditorComponent,
    WebhookConfigEditComponent,
    CredentialIdsComponent,
  ],
  templateUrl: './presentation-create.component.html',
  styleUrls: ['./presentation-create.component.scss'],
})
export class PresentationCreateComponent {
  public form: FormGroup;
  public create = true;

  registrationCertificateRequestSchema = registrationCertificateRequestSchema;

  DCQLSchema = DCQLSchema;

  public predefinedConfigs = configs;

  constructor(
    private presentationService: PresentationManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = new FormGroup({
      id: new FormControl(undefined, [Validators.required]),
      description: new FormControl(undefined, [Validators.required]),
      redirectUri: new FormControl(undefined),
      dcql_query: new FormControl(undefined, [Validators.required]),
      lifeTime: new FormControl(300, [Validators.required, Validators.min(1)]),
      registrationCert: new FormControl(undefined), // Optional field
      attached: new FormArray([]),
      webhook: new FormGroup({
        url: new FormControl(undefined), // Optional, but if filled, should be valid URL
        auth: new FormGroup({
          type: new FormControl(undefined), // Optional
          config: new FormGroup({
            headerName: new FormControl(undefined), // Optional
            value: new FormControl(undefined), // Optional
          }),
        }),
      }),
    } as { [k in keyof Omit<PresentationConfig, 'createdAt'>]: any });

    if (this.route.snapshot.params['id']) {
      this.presentationService
        .getPresentationById(this.route.snapshot.params['id'])
        .then((config) => {
          if (!config) {
            this.snackBar.open('Presentation not found', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          // Convert dcql_query object to JSON string for form display
          const formData: any = { ...config };
          if (formData.dcql_query && typeof formData.dcql_query === 'object') {
            formData.dcql_query = JSON.stringify(formData.dcql_query, null, 2);
          }

          if (formData.registrationCert && typeof formData.registrationCert === 'object') {
            formData.registrationCert = JSON.stringify(formData.registrationCert, null, 2);
          }

          (formData.attached || []).forEach(() => this.addAttachment());

          this.form.patchValue(formData);
          this.form.get('id')?.disable(); // Disable ID field in edit mode
          this.create = false;
        });
    }
  }

  getFormArray(value: string) {
    return this.form.get(value) as FormArray;
  }

  addAttachment(): void {
    this.getFormArray('attached').push(
      new FormGroup({
        format: new FormControl(undefined, [Validators.required]),
        data: new FormControl(undefined, [Validators.required]),
        credential_ids: new FormControl(),
      })
    );
  }

  removeAttachment(index: number) {
    (this.form.get('attached') as FormArray).removeAt(index);
  }

  getFormGroup(value: string) {
    return this.form.get(value) as FormGroup;
  }

  asFormGroup(value: any) {
    return value as FormGroup;
  }

  createOrUpdatePresentation(): void {
    if (this.form.valid) {
      // Parse the JSON string to an object for dcql_query
      const formValue = { ...this.form.value };

      // Convert dcql_query from string to object
      if (formValue.dcql_query) {
        try {
          formValue.dcql_query = extractSchema(formValue.dcql_query);
          formValue.registrationCert = extractSchema(formValue.registrationCert);
        } catch (error) {
          console.error('Error parsing DCQL Query JSON:', error);
          return;
        }
      }

      if (!formValue.webhook.url) {
        formValue.webhook = undefined; // Remove webhook if URL is not provided
      }

      if (!formValue.registrationCert) {
        formValue.registrationCert = undefined; // Remove registrationCert if not provided
      }

      formValue.id = this.route.snapshot.params['id'] || formValue.id;

      // Use the same method for both create and update
      this.presentationService.createConfiguration(formValue).then(
        (res: any) => {
          if (this.create) {
            this.router.navigate(['../', res.id], { relativeTo: this.route });
            this.snackBar.open('Presentation created successfully', 'Close', {
              duration: 3000,
            });
          } else {
            this.router.navigate(['../'], { relativeTo: this.route });
            this.snackBar.open('Presentation updated successfully', 'Close', {
              duration: 3000,
            });
          }
        },
        (err: any) => this.snackBar.open(err.message, 'Close')
      );
    }
  }

  // Helper method to format JSON for display
  formatJson(): void {
    const dcqlControl = this.form.get('dcql_query');
    if (dcqlControl?.value) {
      try {
        const parsed = JSON.parse(dcqlControl.value);
        const formatted = JSON.stringify(parsed, null, 2);
        dcqlControl.setValue(formatted);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Invalid JSON, don't format
      }
    }
  }

  /**
   * Show/Edit the entire presentation config as JSON
   */
  viewAsJson(): void {
    const currentConfig = this.getCompleteConfiguration();
    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Presentation Configuration JSON',
        jsonData: currentConfig,
        readonly: false,
        schema: presentationConfigSchema,
      },
      disableClose: true,
      minWidth: '60vw',
      maxWidth: '95vw',
      maxHeight: '95vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadConfigurationFromJson(result);
      }
    });
  }

  /**
   * Get the complete config object from form values
   */
  private getCompleteConfiguration(): any {
    const formValue = { ...this.form.getRawValue() };
    // Parse dcql_query if it's a string
    if (formValue.dcql_query && typeof formValue.dcql_query === 'string') {
      try {
        formValue.dcql_query = extractSchema(formValue.dcql_query);
        formValue.registrationCert = extractSchema(formValue.registrationCert);
      } catch {
        // Ignore JSON parse errors
      }
    }
    if (!formValue.webhook?.url) {
      formValue.webhook = undefined;
    }
    if (!formValue.registrationCert) {
      formValue.registrationCert = undefined; // Remove registrationCert if not provided
    }

    if (!formValue.redirectUri) {
      formValue.redirectUri = undefined;
    }

    // Clean up empty optional fields
    if (formValue.attached && formValue.attached.length === 0) {
      formValue.attached = undefined;
    }
    return formValue;
  }

  /**
   * Load a predefined configuration
   */
  loadPredefinedConfig(configTemplate: any): void {
    const config = JSON.parse(JSON.stringify(configTemplate.config)); // Deep clone

    this.loadConfigurationFromJson(config);

    this.snackBar.open(`${configTemplate.name} template loaded successfully`, 'OK', {
      duration: 3000,
    });
  }

  /**
   * Show predefined configuration in JSON view (readonly)
   */
  previewPredefinedConfig(configTemplate: any): void {
    this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: `${configTemplate.name} - Preview`,
        jsonData: configTemplate.config,
        readonly: true,
      },
      disableClose: false,
      maxWidth: '95vw',
      maxHeight: '95vh',
    });
  }

  /**
   * Import config from JSON and update the form
   */
  private loadConfigurationFromJson(config: any): void {
    try {
      const formData: any = { ...config };
      if (formData.dcql_query) {
        formData.dcql_query = extractSchema(formData.dcql_query);
      }
      if (formData.registrationCert) {
        formData.registrationCert = extractSchema(formData.registrationCert);
      }

      this.form.patchValue(formData);
      this.snackBar.open('Configuration loaded from JSON successfully', 'OK', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error loading configuration from JSON:', error);
      this.snackBar.open('Error loading configuration from JSON', 'Close', {
        duration: 3000,
      });
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open(`${label} copied to clipboard!`, 'OK', {
        duration: 2000,
        panelClass: ['success-snackbar'],
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      this.snackBar.open(`Failed to copy ${label}`, 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    }
  }
}
