import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfig, IssuanceDto } from '../../../generated';
import { CredentialConfigService } from '../../credential-config/credential-config.service';
import { IssuanceConfigService } from '../issuance-config.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent, extractSchema } from '../../../utils/editor/editor.component';
import { authenticationSchema, webhookSchema } from '../../../utils/schemas';
import { JsonViewDialogComponent } from '../../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-issuance-config-create',
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
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
    MonacoEditorModule,
    EditorComponent,
  ],
  templateUrl: './issuance-config-create.component.html',
  styleUrl: './issuance-config-create.component.scss',
})
export class IssuanceConfigCreateComponent implements OnInit {
  public form: FormGroup;
  public create = true;
  public loading = false;
  public credentialConfigs: CredentialConfig[] = [];
  public availableCredentialConfigs: CredentialConfig[] = [];

  public webhookSchema = webhookSchema;
  public authenticationSchema = authenticationSchema;

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      description: new FormControl(''),
      authenticationConfig: new FormControl(''),
      selectedCredentialConfigs: new FormControl([], [Validators.required]),
      batchSize: new FormControl(1, [Validators.min(1)]),
      notifyWebhook: new FormControl(''),
      claimsWebhook: new FormControl(''),
    });

    // Check if this is edit mode
    const configId = this.route.snapshot.params['id'];
    if (configId) {
      this.create = false;
      this.loadConfigForEdit(configId);
    }
  }

  ngOnInit(): void {
    this.loadCredentialConfigs();
  }

  private async loadCredentialConfigs(): Promise<void> {
    try {
      this.availableCredentialConfigs = await this.credentialConfigService.loadConfigurations();
    } catch (error) {
      console.error('Error loading credential configs:', error);
      this.snackBar.open('Failed to load credential configurations', 'Close', {
        duration: 3000,
      });
    }
  }

  private async loadConfigForEdit(configId: string): Promise<void> {
    try {
      const config = await this.issuanceConfigService.getConfig(configId);
      if (!config) {
        this.snackBar.open('Configuration not found', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['../'], { relativeTo: this.route });
        return;
      }


      // Extract selected credential config IDs
      const selectedCredentialConfigs =
        config.credentialIssuanceBindings?.map((binding: any) => binding.credentialConfigId) || [];

      this.form.patchValue({
        id: config.id,
        description: config.description,
        authenticationConfig: config.authenticationConfig,
        selectedCredentialConfigs: selectedCredentialConfigs,
        batchSize: config.batch_size,
        notifyWebhook: config.notifyWebhook,
        claimsWebhook: config.claimsWebhook,
      });

      // Disable ID field in edit mode
      this.form.get('id')?.disable();
    } catch (error) {
      console.error('Error loading config:', error);
      this.snackBar.open('Failed to load configuration', 'Close', {
        duration: 3000,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    try {
      // Prepare credential config mappings
      const credentialConfigs = formValue.selectedCredentialConfigs.map((id: string) => ({
        id: id,
      }));

      const issuanceDto: IssuanceDto = {
        id: this.create ? formValue.id : this.route.snapshot.params['id'],
        description: formValue.description,
        authenticationConfig: extractSchema(formValue.authenticationConfig),
        credentialConfigs: credentialConfigs,
        batch_size: formValue.batchSize,
        notifyWebhook: extractSchema(formValue.notifyWebhook),
        claimsWebhook: extractSchema(formValue.claimsWebhook)
      };

      this.issuanceConfigService
        .saveConfiguration(issuanceDto)
        .then(
          () => {
            this.snackBar.open(
              `Configuration ${this.create ? 'created' : 'updated'} successfully`,
              'Close',
              { duration: 3000 }
            );
            this.router.navigate(['../'], { relativeTo: this.route });
          },
          (error: string) => {
            this.snackBar.open(`Failed to save configuration: ${error}`, 'Close', {
              duration: 3000,
            });
          }
        )
        .finally(() => {
          this.loading = false;
        });
    } catch (error) {
      console.error('Error preparing configuration:', error);
      this.snackBar.open('Failed to prepare configuration', 'Close', {
        duration: 3000,
      });
      this.loading = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  getSelectedCredentialConfigsDisplay(): string[] {
    const selectedIds = this.form.get('selectedCredentialConfigs')?.value || [];
    return selectedIds.map((id: string) => {
      const config = this.availableCredentialConfigs.find((c) => c.id === id);
      return config ? `${config.id} (${config.vct?.name || 'Unknown'})` : id;
    });
  }

    /**
     * Open JSON view dialog to show/edit the complete configuration
     */
    viewAsJson(): void {
      const currentConfig = this.form.value;

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
          this.form.patchValue(result);
          //this.loadConfigurationFromJson(result);
        }
      });
    }
}
