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
import { CredentialConfigCreate, KeyEntity } from '@eudiplo/sdk';
import { KeyManagementService } from '../../../key-management/key-management.service';
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
  fbWebhook,
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
  keys: KeyEntity[] = [];

  predefinedConfigs = configs;

  vctSchema = vctSchema;
  embeddedDisclosurePolicySchema = embeddedDisclosurePolicySchema;

  constructor(
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private keyManagementService: KeyManagementService,
    private dialog: MatDialog
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      description: new FormControl('', Validators.required),
      keyId: new FormControl(''),
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
      claimsWebhook: fbWebhook,
      notificationWebhook: fbWebhook,
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

          // Disable non-editable fields for edit mode
          this.form.patchValue({
            id: config.id,
            description: config.description,
            keyId: config.keyId,
            scope: config.config.scope,
            lifeTime: config.lifeTime,
            keyBinding: config.keyBinding,
            statusManagement: config.statusManagement,
            claims: config.claims ? JSON.stringify(config.claims, null, 2) : '',
            disclosureFrame: config.disclosureFrame
              ? JSON.stringify(config.disclosureFrame, null, 2)
              : '',
            vct: config.vct ? JSON.stringify(config.vct, null, 2) : '',
            schema: config.schema ? JSON.stringify(config.schema, null, 2) : '',
            displayConfigs: config.config.display || [],
            embeddedDisclosurePolicy: config.embeddedDisclosurePolicy
              ? JSON.stringify(config.embeddedDisclosurePolicy, null, 2)
              : '',
          });

          //set field as readonly
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
  ngOnInit(): void {
    this.keyManagementService.loadKeys().then((keys) => (this.keys = keys));
  }

  onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;

    // Prepare the form data
    const formValue = { ...this.form.value };
    formValue.id = this.route.snapshot.params['id'] || formValue.id;

    try {
      // Build the technical configuration
      formValue.config = {
        format: 'dc+sd-jwt',
        display: formValue.displayConfigs,
        scope: formValue.scope,
      };

      // Parse JSON fields when there is a value
      if (formValue.claims) {
        formValue.claims =
          typeof formValue.claims === 'string' ? JSON.parse(formValue.claims) : formValue.claims;
      } else {
        delete formValue.claims;
      }
      if (formValue.disclosureFrame) {
        formValue.disclosureFrame =
          typeof formValue.disclosureFrame === 'string'
            ? JSON.parse(formValue.disclosureFrame)
            : formValue.disclosureFrame;
      } else {
        delete formValue.disclosureFrame;
      }

      if (formValue.vct === '') {
        formValue.vct = null;
      }
      if (formValue.vct) {
        formValue.vct =
          typeof formValue.vct === 'string' ? extractSchema(formValue.vct) : formValue.vct;
      }
      if (formValue.schema === '') {
        formValue.schema = null;
      }
      if (formValue.schema) {
        formValue.schema =
          typeof formValue.schema === 'string' ? JSON.parse(formValue.schema) : formValue.schema;
      }
      if (formValue.embeddedDisclosurePolicy === '') {
        formValue.embeddedDisclosurePolicy = null;
      }
      if (formValue.embeddedDisclosurePolicy) {
        formValue.embeddedDisclosurePolicy =
          typeof formValue.embeddedDisclosurePolicy === 'string'
            ? extractSchema(formValue.embeddedDisclosurePolicy)
            : formValue.embeddedDisclosurePolicy;
      }
      if (!formValue.claimsWebhook?.url) {
        formValue.claimsWebhook = null;
      }

      if (!formValue.notificationWebhook?.url) {
        formValue.notificationWebhook = null;
      }

      // Remove the displayConfigs form array from the final data
      delete formValue.displayConfigs;
    } catch {
      this.snackBar.open('Invalid JSON format in one of the fields', 'Close', {
        duration: 3000,
      });
      this.loading = false;
      return;
    }

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
  }

  getFormGroup(controlName: string): FormGroup {
    return this.form.get(controlName) as FormGroup;
  }

  getControl(value: any) {
    return value as FormControl;
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
    const currentConfig = this.getCompleteConfiguration();

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
   * Get the complete configuration object from form values
   */
  private getCompleteConfiguration(): any {
    const formValue = { ...this.form.value };
    formValue.id = this.route.snapshot.params['id'] || formValue.id;

    try {
      formValue.config = {
        format: 'dc+sd-jwt',
        display: formValue.displayConfigs,
      };

      // Parse JSON fields
      formValue.claims = formValue.claims ? JSON.parse(formValue.claims) : undefined;
      formValue.disclosureFrame = formValue.disclosureFrame
        ? JSON.parse(formValue.disclosureFrame)
        : undefined;
      formValue.vct = formValue.vct ? JSON.parse(formValue.vct) : undefined;
      formValue.schema = formValue.schema ? JSON.parse(formValue.schema) : undefined;
      formValue.embeddedDisclosurePolicy = formValue.embeddedDisclosurePolicy
        ? JSON.parse(formValue.embeddedDisclosurePolicy)
        : undefined;

      // Remove the displayConfigs form array from the final data
      delete formValue.displayConfigs;

      return formValue;
    } catch (error) {
      console.error('Error building configuration:', error);
      return this.form.value;
    }
  }

  /**
   * Load configuration from JSON object into the form
   */
  private loadConfigurationFromJson(config: CredentialConfigCreate): void {
    try {
      // Update basic form fields
      this.form.patchValue({
        id: config.id || '',
        keyId: config.keyId || '',
        scope: config.config.scope || '',
        description: config.description || '',
        lifeTime: config.lifeTime || 3600,
        keyBinding: config.keyBinding ?? true,
        statusManagement: config.statusManagement ?? true,
        claims: config.claims ? JSON.stringify(config.claims, null, 2) : '',
        disclosureFrame: config.disclosureFrame
          ? JSON.stringify(config.disclosureFrame, null, 2)
          : '',
        vct: config.vct ? JSON.stringify(config.vct, null, 2) : '',
        schema: config.schema ? JSON.stringify(config.schema, null, 2) : '',
        displayConfigs: config.config?.display || [],
        embeddedDisclosurePolicy: config.embeddedDisclosurePolicy
          ? JSON.stringify(config.embeddedDisclosurePolicy, null, 2)
          : '',
      });

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
