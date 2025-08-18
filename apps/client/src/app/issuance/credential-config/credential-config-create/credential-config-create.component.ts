import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { CertEntity } from '../../../generated';
import { KeyManagementService } from '../../../key-management/key-management.service';
import { CredentialConfigService } from '../credential-config.service';
import { JsonViewDialogComponent } from './json-view-dialog/json-view-dialog.component';
import { configs } from './pre-config';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'app-credential-config-create',
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
  ],
  templateUrl: './credential-config-create.component.html',
  styleUrl: './credential-config-create.component.scss',
})
export class CredentialConfigCreateComponent implements OnInit {
  public form: FormGroup;
  public create = true;
  public loading = false;
  keys: CertEntity[] = [];

  predefinedConfigs = configs;

  editorOptions = {
    language: 'json',
    automaticLayout: true
  };

  constructor(
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private keyManagementService: KeyManagementService,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      id: ['', [Validators.required]],
      keyId: [''],
      lifeTime: [3600, [Validators.min(1)]],
      keyBinding: [true, [Validators.required]],
      statusManagement: [true, [Validators.required]],
      claims: [''],
      disclosureFrame: [''],
      vct: [''],
      schema: [''],
      displayConfigs: this.fb.array([this.createDisplayConfigGroup()]),
    });

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
            keyId: config.keyId,
            lifeTime: config.lifeTime,
            keyBinding: config.keyBinding,
            statusManagement: config.statusManagement,
            claims: config.claims ? JSON.stringify(config.claims, null, 2) : '',
            disclosureFrame: config.disclosureFrame
              ? JSON.stringify(config.disclosureFrame, null, 2)
              : '',
            vct: config.vct ? JSON.stringify(config.vct, null, 2) : '',
            schema: config.schema ? JSON.stringify(config.schema, null, 2) : '',
            displayConfigs: config.config?.['display'] || [],
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
      };

      // Parse JSON fields
      formValue.claims = formValue.claims ? JSON.parse(formValue.claims) : undefined;
      formValue.disclosureFrame = formValue.disclosureFrame
        ? JSON.parse(formValue.disclosureFrame)
        : undefined;
      formValue.vct = formValue.vct ? JSON.parse(formValue.vct) : undefined;
      formValue.schema = formValue.schema ? JSON.parse(formValue.schema) : undefined;

      // Remove the displayConfigs form array from the final data
      delete formValue.displayConfigs;
    } catch (error) {
      console.error('Error parsing JSON:', error);
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
          this.snackBar.open('Failed to save configuration', 'Close', {
            duration: 3000,
          });
        }
      )
      .finally(() => {
        this.loading = false;
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  // Display Configuration Management
  createDisplayConfigGroup(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      locale: ['en-US', [Validators.required]],
      background_color: ['#FFFFFF'],
      text_color: ['#000000'],
      // Handle both nested (from API/JSON) and flattened (from form) formats
      background_image_uri: [''],
      background_image_url: [''],
      logo_uri: [''],
      logo_url: [''],
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
      },
      disableClose: false,
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
  private loadConfigurationFromJson(config: any): void {
    try {
      // Update basic form fields
      this.form.patchValue({
        id: config.id || '',
        keyId: config.keyId || '',
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
        readonly: true,
      },
      disableClose: false,
      maxWidth: '95vw',
      maxHeight: '95vh',
    });
  }
}
