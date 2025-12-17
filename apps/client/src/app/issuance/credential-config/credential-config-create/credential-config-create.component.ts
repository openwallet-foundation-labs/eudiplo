import { Component, type OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfigCreate, certControllerGetCertificates } from '@eudiplo/sdk';
import { CredentialConfigService } from '../credential-config.service';
import { JsonViewDialogComponent } from './json-view-dialog/json-view-dialog.component';
import { configs } from './pre-config';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import {
  credentialConfigSchema,
  embeddedDisclosurePolicySchema,
  vctSchema,
} from '../../../utils/schemas';
import { EditorComponent, extractSchema } from '../../../utils/editor/editor.component';
import { ImageFieldComponent } from '../../../utils/image-field/image-field.component';
import {
  createWebhookFormGroup,
  WebhookConfigEditComponent,
} from '../../../utils/webhook-config-edit/webhook-config-edit.component';

@Component({
  selector: 'app-credential-config-create',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
    FlexLayoutModule,
    MatSlideToggleModule,
    MatExpansionModule,
    ReactiveFormsModule,
    RouterModule,
    MonacoEditorModule,
    EditorComponent,
    ImageFieldComponent,
    WebhookConfigEditComponent,
  ],
  templateUrl: './credential-config-create.component.html',
  styleUrl: './credential-config-create.component.scss',
})
export class CredentialConfigCreateComponent implements OnInit {
  public form: FormGroup;
  public create = true;
  public loading = false;
  certificates: any[] = [];

  predefinedConfigs = configs;

  vctSchema = vctSchema;
  embeddedDisclosurePolicySchema = embeddedDisclosurePolicySchema;

  constructor(
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      description: new FormControl('', Validators.required),
      certId: new FormControl(''),
      scope: new FormControl(''),
      lifeTime: new FormControl(3600, [Validators.min(1)]),
      keyBinding: new FormControl(true, [Validators.required]),
      statusManagement: new FormControl(true, [Validators.required]),
      claims: new FormControl(''),
      disclosureFrame: new FormControl(''),
      vct: new FormControl(''),
      schema: new FormControl(''),
      displayConfigs: new FormArray([this.createDisplayConfigGroup()]),
      embeddedDisclosurePolicy: new FormControl(''),
      claimsWebhook: createWebhookFormGroup(),
      notificationWebhook: createWebhookFormGroup(),
    } as { [k in keyof Omit<CredentialConfigCreate, 'config'>]: any });

    if (this.route.snapshot.params['id']) {
      this.create = false;
      this.credentialConfigService.getConfig(this.route.snapshot.params['id']).then(
        (config) => {
          if (!config) {
            this.snackBar.open('Config not found', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          this.patchFormFromConfig(config);
          this.form.get('id')?.disable();
        },
        (error) => {
          console.error('Error loading key:', error);
          this.snackBar.open('Failed to load key', 'Close', {
            duration: 3000,
          });
        }
      );
    }
  }
  async ngOnInit(): Promise<void> {
    // Load all certificates directly
    try {
      const response = await certControllerGetCertificates({});
      this.certificates = response.data || [];
    } catch (error) {
      console.error('Failed to load certificates:', error);
      this.snackBar.open('Failed to load certificates', 'Close', {
        duration: 3000,
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;

    try {
      const formValue = this.buildConfigurationPayload();

      this.credentialConfigService
        .saveConfiguration(formValue)
        .then(
          () => {
            this.snackBar.open(
              `Configuration ${this.create ? 'created' : 'updated'} successfully`,
              'Close',
              { duration: 3000 }
            );
            this.router.navigate(['../'], { relativeTo: this.route });
          },
          (error) => {
            console.error('Error saving configuration:', error);
            this.snackBar.open(`Failed to save configuration: ${error.message}`, 'Close', {
              duration: 3000,
            });
          }
        )
        .finally(() => {
          this.loading = false;
        });
    } catch {
      this.snackBar.open('Invalid JSON format in one of the fields', 'Close', {
        duration: 3000,
      });
      this.loading = false;
    }
  }

  getFormGroup(controlName: string): FormGroup {
    return this.form.get(controlName) as FormGroup;
  }

  getControl(value: any) {
    return value as FormControl;
  }

  /**
   * Patch form with configuration data (reusable for edit mode and JSON load)
   */
  private patchFormFromConfig(config: CredentialConfigCreate): void {
    this.form.patchValue({
      id: config.id || '',
      certId: config.certId || '',
      scope: config.config?.scope || '',
      description: config.description || '',
      lifeTime: config.lifeTime || 3600,
      keyBinding: config.keyBinding ?? true,
      statusManagement: config.statusManagement ?? true,
      claims: this.stringifyField(config.claims),
      claimsWebhook: config.claimsWebhook,
      notificationWebhook: config.notificationWebhook,
      disclosureFrame: this.stringifyField(config.disclosureFrame),
      vct: this.stringifyField(config.vct),
      schema: this.stringifyField(config.schema),
      displayConfigs: config.config?.display || [],
      embeddedDisclosurePolicy: this.stringifyField(config.embeddedDisclosurePolicy),
    } as { [k in keyof Omit<CredentialConfigCreate, 'config'>]: any });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  // Display Configuration Management
  createDisplayConfigGroup(): FormGroup {
    return new FormGroup({
      name: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.required]),
      locale: new FormControl('en-US', [Validators.required]),
      background_color: new FormControl('#FFFFFF'),
      text_color: new FormControl('#000000'),
      // Handle both nested (from API/JSON) and flattened (from form) formats
      background_image: new FormGroup({
        uri: new FormControl(''),
      }),
      logo: new FormGroup({
        uri: new FormControl(''),
      }),
    });
  }

  get displayConfigs(): FormArray {
    return this.form.get('displayConfigs') as FormArray;
  }

  addDisplayConfig(): void {
    this.displayConfigs.push(this.createDisplayConfigGroup());
  }

  removeDisplayConfig(index: number): void {
    if (this.displayConfigs.length > 1) {
      this.displayConfigs.removeAt(index);
    }
  }

  /**
   * Open JSON view dialog to show/edit the complete configuration
   */
  viewAsJson(): void {
    const currentConfig = this.buildConfigurationPayload();

    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Complete Configuration JSON',
        jsonData: currentConfig,
        readonly: false,
        schema: credentialConfigSchema,
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
   * Build configuration payload from form values with proper JSON parsing
   */
  private buildConfigurationPayload(): any {
    const formValue = { ...this.form.value };
    formValue.id = this.route.snapshot.params['id'] || formValue.id;

    formValue.config = {
      format: 'dc+sd-jwt',
      display: formValue.displayConfigs,
      scope: formValue.scope || undefined,
    };

    // Convert empty strings to undefined for optional fields
    formValue.certId = formValue.certId || undefined;
    formValue.scope = formValue.scope || undefined;

    // Parse JSON fields using helper
    formValue.claims = this.parseJsonField(formValue.claims, 'parse');
    formValue.disclosureFrame = this.parseJsonField(formValue.disclosureFrame, 'parse');
    formValue.vct = this.parseJsonField(formValue.vct, 'extract');
    formValue.schema = this.parseJsonField(formValue.schema, 'parse');
    formValue.embeddedDisclosurePolicy = this.parseJsonField(
      formValue.embeddedDisclosurePolicy,
      'extract'
    );

    // Handle webhooks
    formValue.claimsWebhook = formValue.claimsWebhook?.url ? formValue.claimsWebhook : undefined;
    formValue.notificationWebhook = formValue.notificationWebhook?.url
      ? formValue.notificationWebhook
      : undefined;

    delete formValue.displayConfigs;
    return formValue;
  }

  /**
   * Helper to parse JSON fields with proper null/undefined handling
   */
  private parseJsonField(value: any, mode: 'parse' | 'extract' = 'parse'): any {
    if (!value || value === '') return undefined;
    if (typeof value !== 'string') return value;

    const parsed = JSON.parse(value);
    return mode === 'extract' ? extractSchema(value) : parsed;
  }

  /**
   * Helper to stringify values for form fields
   */
  private stringifyField(value: any): string {
    return value ? JSON.stringify(value, null, 2) : '';
  }

  /**
   * Load configuration from JSON object into the form
   */
  private loadConfigurationFromJson(config: CredentialConfigCreate): void {
    try {
      this.patchFormFromConfig(config);

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
      },
      disableClose: false,
      maxWidth: '95vw',
      maxHeight: '95vh',
    });
  }
}
