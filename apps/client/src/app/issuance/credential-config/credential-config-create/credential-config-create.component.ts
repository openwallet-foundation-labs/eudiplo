import { Component, type OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { CredentialConfigCreate, certControllerGetCertificates } from '@eudiplo/sdk-core';
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
    MatButtonToggleModule,
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

  // Lifetime presets in seconds
  lifetimePresets = [
    { label: '1 hour', value: 3600 },
    { label: '8 hours', value: 28800 },
    { label: '1 day', value: 86400 },
    { label: '7 days', value: 604800 },
    { label: '30 days', value: 2592000 },
    { label: '1 year', value: 31536000 },
    { label: 'Custom', value: null },
  ];

  // Common mDOC document types
  docTypePresets = [
    {
      label: 'Mobile Driving License (mDL)',
      value: 'org.iso.18013.5.1.mDL',
      namespace: 'org.iso.18013.5.1',
    },
    { label: 'EU PID', value: 'eu.europa.ec.eudi.pid.1', namespace: 'eu.europa.ec.eudi.pid.1' },
    { label: 'EU mDL', value: 'org.iso.18013.5.1.mDL', namespace: 'org.iso.18013.5.1' },
    { label: 'Custom', value: '', namespace: '' },
  ];

  selectedLifetimePreset: number | null = 3600;
  customLifetime = false;

  vctSchema = vctSchema;
  embeddedDisclosurePolicySchema = embeddedDisclosurePolicySchema;

  // VCT mode: 'string' for simple URI, 'object' for metadata object
  vctMode: 'string' | 'object' = 'string';

  get isMdocFormat(): boolean {
    return this.form.get('format')?.value === 'mso_mdoc';
  }

  constructor(
    private readonly credentialConfigService: CredentialConfigService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      description: new FormControl('', Validators.required),
      format: new FormControl('dc+sd-jwt', [Validators.required]),
      certId: new FormControl(''),
      scope: new FormControl(''),
      lifeTime: new FormControl(3600, [Validators.min(1)]),
      keyBinding: new FormControl(true, [Validators.required]),
      statusManagement: new FormControl(true, [Validators.required]),
      claims: new FormControl(''),
      // SD-JWT specific fields
      disclosureFrame: new FormControl(''),
      vct: new FormControl(''),
      vctString: new FormControl(''),
      // mDOC specific fields
      docType: new FormControl(''),
      namespace: new FormControl(''),
      claimsByNamespace: new FormControl(''),
      // Common fields
      schema: new FormControl(''),
      displayConfigs: new FormArray([this.createDisplayConfigGroup()]),
      embeddedDisclosurePolicy: new FormControl(''),
      claimsWebhook: createWebhookFormGroup(),
      notificationWebhook: createWebhookFormGroup(),
    } as { [k in keyof Omit<CredentialConfigCreate, 'config'>]: any });

    // Set initial validator for vctString based on default mode
    if (this.vctMode === 'string') {
      this.form.get('vctString')?.setValidators([Validators.required]);
      this.form.get('vctString')?.updateValueAndValidity();
    }

    // Listen for format changes to update validators
    this.form.get('format')?.valueChanges.subscribe((format) => {
      const vctStringControl = this.form.get('vctString');
      if (format === 'mso_mdoc') {
        // mDOC doesn't need vctString - clear validators
        vctStringControl?.clearValidators();
      } else {
        // SD-JWT needs vctString when in string mode
        if (this.vctMode === 'string') {
          vctStringControl?.setValidators([Validators.required]);
        }
      }
      vctStringControl?.updateValueAndValidity();
    });

    if (this.route.snapshot.params['id']) {
      this.create = false;
    }
  }
  ngOnInit() {
    // Load all certificates directly
    certControllerGetCertificates({}).then(
      (res) => (this.certificates = res.data || []),
      (error) => {
        console.error('Failed to load certificates:', error);
        this.snackBar.open('Failed to load certificates', 'Close', {
          duration: 3000,
        });
      }
    );

    const id = this.route.snapshot.params['id'];
    if (!id) {
      return;
    }
    this.credentialConfigService.getConfig(id).then(
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

  onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      const invalidFields = this.getInvalidFields();
      this.snackBar.open(
        `Please fix invalid fields: ${invalidFields.join(', ')}`,
        'Close',
        { duration: 5000 }
      );
      console.log('Invalid fields:', invalidFields);
      return;
    }

    // Additional validation for SD-JWT: VCT URI is required
    const isMdoc = this.form.get('format')?.value === 'mso_mdoc';
    if (!isMdoc && this.vctMode === 'string') {
      const vctString = this.form.get('vctString')?.value?.trim();
      if (!vctString) {
        this.form.get('vctString')?.setErrors({ required: true });
        this.form.get('vctString')?.markAsTouched();
        this.snackBar.open('VCT URI is required for SD-JWT credentials', 'Close', {
          duration: 3000,
        });
        return;
      }
    }

    this.loading = true;

    try {
      const formValue = this.buildConfigurationPayload();
      const configId = this.route.snapshot.params['id'];

      const savePromise = this.create
        ? this.credentialConfigService.saveConfiguration(formValue)
        : this.credentialConfigService.updateConfiguration(configId, formValue);

      savePromise
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
    // Determine VCT mode based on the type of vct value
    if (config.vct) {
      if (typeof config.vct === 'string') {
        this.vctMode = 'string';
      } else {
        this.vctMode = 'object';
      }
    }

    // Update vctString validators based on mode
    const vctStringControl = this.form.get('vctString');
    if (this.vctMode === 'string') {
      vctStringControl?.setValidators([Validators.required]);
    } else {
      vctStringControl?.clearValidators();
    }
    vctStringControl?.updateValueAndValidity();

    this.form.patchValue({
      id: config.id || '',
      certId: config.certId || '',
      format: config.config?.format || 'dc+sd-jwt',
      scope: config.config?.scope || '',
      description: config.description || '',
      lifeTime: config.lifeTime || 3600,
      keyBinding: config.keyBinding ?? true,
      statusManagement: config.statusManagement ?? true,
      claims: this.stringifyField(config.claims),
      claimsWebhook: config.claimsWebhook,
      notificationWebhook: config.notificationWebhook,
      // SD-JWT specific
      disclosureFrame: this.stringifyField(config.disclosureFrame),
      vct: typeof config.vct === 'object' ? this.stringifyField(config.vct) : '',
      vctString: typeof config.vct === 'string' ? config.vct : '',
      // mDOC specific
      docType: config.config?.docType || '',
      namespace: config.config?.namespace || '',
      claimsByNamespace: this.stringifyField(config.config?.claimsByNamespace),
      // Common
      schema: this.stringifyField(config.schema),
      displayConfigs: config.config?.display || [],
      embeddedDisclosurePolicy: this.stringifyField(config.embeddedDisclosurePolicy),
    } as { [k in keyof Omit<CredentialConfigCreate, 'config'>]: any });

    // Update lifetime preset selection
    this.updateLifetimePresetFromValue(config.lifeTime || 3600);
  }

  /**
   * Update lifetime preset selection based on value
   */
  private updateLifetimePresetFromValue(value: number): void {
    const preset = this.lifetimePresets.find((p) => p.value === value);
    if (preset) {
      this.selectedLifetimePreset = preset.value;
      this.customLifetime = false;
    } else {
      this.selectedLifetimePreset = null;
      this.customLifetime = true;
    }
  }

  /**
   * Handle lifetime preset selection
   */
  onLifetimePresetChange(presetValue: number | null): void {
    this.selectedLifetimePreset = presetValue;
    if (presetValue === null) {
      this.customLifetime = true;
    } else {
      this.customLifetime = false;
      this.form.get('lifeTime')?.setValue(presetValue);
    }
  }

  /**
   * Handle VCT mode change
   */
  onVctModeChange(mode: 'string' | 'object'): void {
    this.vctMode = mode;
    const vctStringControl = this.form.get('vctString');
    if (mode === 'string') {
      // Clear the vct object field when switching to string mode
      this.form.get('vct')?.setValue('');
      // Add required validator for vctString
      vctStringControl?.setValidators([Validators.required]);
    } else {
      // Clear the vctString field when switching to object mode
      // The vct URL will be auto-generated by EUDIPLO, user only provides other metadata
      vctStringControl?.setValue('');
      // Remove required validator for vctString
      vctStringControl?.clearValidators();
    }
    vctStringControl?.updateValueAndValidity();
  }

  /**
   * Get the auto-generated VCT URI based on the credential config ID
   */
  getVctUri(): string {
    const configId = this.form.get('id')?.value || '<credential-id>';
    // The actual tenant ID will be determined server-side, show placeholder
    return `<PUBLIC_URL>/<tenantId>/credentials-metadata/vct/${configId}`;
  }

  /**
   * Handle docType preset selection
   */
  onDocTypePresetChange(preset: { value: string; namespace: string }): void {
    this.form.get('docType')?.setValue(preset.value);
    if (preset.namespace) {
      this.form.get('namespace')?.setValue(preset.namespace);
    }
  }

  /**
   * Format lifetime value for display
   */
  formatLifetime(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months`;
    return `${Math.floor(seconds / 31536000)} years`;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get list of invalid field names for debugging
   */
  private getInvalidFields(): string[] {
    const invalidFields: string[] = [];
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control?.invalid) {
        // Check if it's a FormArray (like displayConfigs)
        if (control instanceof FormArray) {
          control.controls.forEach((group, index) => {
            if (group instanceof FormGroup) {
              Object.keys(group.controls).forEach((childKey) => {
                if (group.get(childKey)?.invalid) {
                  invalidFields.push(`${key}[${index}].${childKey}`);
                }
              });
            }
          });
        } else {
          invalidFields.push(key);
        }
      }
    });
    return invalidFields;
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

    const isMdoc = formValue.format === 'mso_mdoc';

    formValue.config = {
      format: formValue.format,
      display: formValue.displayConfigs,
      scope: formValue.scope || undefined,
      // mDOC specific fields
      ...(isMdoc && {
        docType: formValue.docType || undefined,
        namespace: formValue.namespace || undefined,
        claimsByNamespace: this.parseJsonField(formValue.claimsByNamespace, 'parse'),
      }),
    };

    // Convert empty strings to null to clear optional fields (for PATCH semantics)
    formValue.certId = formValue.certId || null;
    formValue.scope = formValue.scope || null;

    // Parse JSON fields using helper - use null to clear, undefined is not sent
    formValue.claims = this.parseJsonField(formValue.claims, 'parse', true);

    // SD-JWT specific fields (only include if SD-JWT format)
    if (isMdoc) {
      formValue.disclosureFrame = null;
      formValue.vct = null;
    } else {
      formValue.disclosureFrame = this.parseJsonField(formValue.disclosureFrame, 'parse', true);
      // Handle VCT based on mode:
      // - string mode: use custom URI entered by user
      // - object mode: send the metadata object (vct field inside will be auto-generated by backend)
      if (this.vctMode === 'string') {
        formValue.vct = formValue.vctString?.trim() || null;
      } else {
        formValue.vct = this.parseJsonField(formValue.vct, 'extract', true);
      }
    }

    formValue.schema = this.parseJsonField(formValue.schema, 'parse', true);
    formValue.embeddedDisclosurePolicy = this.parseJsonField(
      formValue.embeddedDisclosurePolicy,
      'extract',
      true
    );

    // Handle webhooks - use null to clear
    formValue.claimsWebhook = formValue.claimsWebhook?.url ? formValue.claimsWebhook : null;
    formValue.notificationWebhook = formValue.notificationWebhook?.url
      ? formValue.notificationWebhook
      : null;

    // Clean up form-only fields
    delete formValue.displayConfigs;
    delete formValue.vctString;
    delete formValue.format;
    delete formValue.docType;
    delete formValue.namespace;
    delete formValue.claimsByNamespace;
    return formValue;
  }

  /**
   * Helper to parse JSON fields with proper null/undefined handling
   * @param useNullForEmpty - if true, returns null for empty values (for PATCH to clear field)
   */
  private parseJsonField(
    value: any,
    mode: 'parse' | 'extract' = 'parse',
    useNullForEmpty = false
  ): any {
    if (!value || value === '') return useNullForEmpty ? null : undefined;
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
    const config = structuredClone(configTemplate.config);

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
