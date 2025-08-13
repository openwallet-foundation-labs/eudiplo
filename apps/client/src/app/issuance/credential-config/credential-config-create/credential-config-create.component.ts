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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CertEntity } from '../../../generated';
import { KeyManagementService } from '../../../key-management/key-management.service';
import { CredentialConfigService } from '../credential-config.service';

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
    FlexLayoutModule,
    MatSlideToggleModule,
    MatExpansionModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './credential-config-create.component.html',
  styleUrl: './credential-config-create.component.scss',
})
export class CredentialConfigCreateComponent implements OnInit {
  public form: FormGroup;
  public create = true;
  public loading = false;
  keys: CertEntity[] = [];

  constructor(
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private keyManagementService: KeyManagementService,
    private fb: FormBuilder
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
          });

          // Handle display configurations
          if (config.config?.['display'] && Array.isArray(config.config['display'])) {
            const displayFormArray = this.form.get('displayConfigs') as FormArray;
            displayFormArray.clear();
            config.config['display'].forEach((display: any) => {
              displayFormArray.push(this.createDisplayConfigGroup(display));
            });
          }

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
      const displayConfigs = this.getDisplayConfigsValue();
      formValue.config = {
        format: 'dc+sd-jwt',
        display: displayConfigs,
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
  createDisplayConfigGroup(display?: any): FormGroup {
    return this.fb.group({
      name: [display?.name || '', [Validators.required]],
      description: [display?.description || '', [Validators.required]],
      locale: [display?.locale || 'en-US', [Validators.required]],
      background_color: [display?.background_color || '#FFFFFF'],
      text_color: [display?.text_color || '#000000'],
      background_image_uri: [display?.background_image?.uri || ''],
      background_image_url: [display?.background_image?.url || ''],
      logo_uri: [display?.logo?.uri || ''],
      logo_url: [display?.logo?.url || ''],
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

  private getDisplayConfigsValue(): any[] {
    return this.displayConfigs.value
      .map((display: any) => ({
        name: display.name,
        description: display.description,
        locale: display.locale,
        background_color: display.background_color,
        text_color: display.text_color,
        background_image: {
          uri: display.background_image_uri || undefined,
          url: display.background_image_url || undefined,
        },
        logo: {
          uri: display.logo_uri || undefined,
          url: display.logo_url || undefined,
        },
      }))
      .map((display: any) => {
        // Clean up empty image objects
        if (!display.background_image.uri && !display.background_image.url) {
          delete display.background_image;
        }
        if (!display.logo.uri && !display.logo.url) {
          delete display.logo;
        }
        return display;
      });
  }
}
