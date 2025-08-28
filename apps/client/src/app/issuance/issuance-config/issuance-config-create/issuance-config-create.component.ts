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
import { CredentialConfig, IssuanceDto, PresentationConfig } from '../../../generated';
import { CredentialConfigService } from '../../credential-config/credential-config.service';
import { IssuanceConfigService } from '../issuance-config.service';
import { issuanceConfigSchema, webhookSchema } from '../../../utils/schemas';
import { JsonViewDialogComponent } from '../../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PresentationManagementService } from '../../../presentation/presentation-config/presentation-management.service';
import { WebhookConfigComponent } from '../../../utils/webhook-config/webhook-config.component';
import { MatSlideToggle, MatSlideToggleModule } from "@angular/material/slide-toggle";

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
    MatSlideToggleModule,
    WebhookConfigComponent,
    MatSlideToggle
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
  public presentationConfigs: PresentationConfig[] = [];

  public webhookSchema = webhookSchema;

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private credentialConfigService: CredentialConfigService,
    private presentationManagementService: PresentationManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      description: new FormControl(''),
      authenticationConfig: new FormGroup({
        method: new FormControl('', Validators.required),
        config: new FormControl(null, Validators.required),
      }),
      credentialConfigIds: new FormControl([], [Validators.required]),
      batchSize: new FormControl(1, [Validators.min(1)]),
      dPopRequired: new FormControl(true),
      notifyWebhook: new FormGroup({
        url: new FormControl(''),
        auth: new FormGroup({
          type: new FormControl(''),
          config: new FormGroup({
            headerName: new FormControl(''),
            value: new FormControl(''),
          }),
        }),
      }),
      claimsWebhook: new FormGroup({
        url: new FormControl(''),
        auth: new FormGroup({
          type: new FormControl(''),
          config: new FormGroup({
            headerName: new FormControl(''),
            value: new FormControl(''),
          }),
        }),
      }),
    } as { [k in keyof IssuanceDto]: any });

    // Listen for changes on authenticationConfig.method
    this.form.get('authenticationConfig.method')!.valueChanges.subscribe((method) => {
      const configGroup = new FormGroup({});
      if (method === 'presentationDuringIssuance') {
        configGroup.addControl('type', new FormControl('', Validators.required));
      } else if (method === 'auth') {
        configGroup.addControl('url', new FormControl('', Validators.required));
      }
      // Replace the config group
      (this.form.get('authenticationConfig') as FormGroup).setControl('config', configGroup);
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
    this.presentationManagementService.loadConfigurations().then((configs) => {
      this.presentationConfigs = configs;
    });
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
      const credentialConfigIds = config.credentialConfigs?.map((config) => config.id) || [];

      this.form.patchValue({
        id: config.id,
        description: config.description,
        authenticationConfig: config.authenticationConfig,
        credentialConfigIds,
        batchSize: config.batchSize,
        dPopRequired: config.dPopRequired,
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
      const issuanceDto: IssuanceDto = {
        id: this.create ? formValue.id : this.route.snapshot.params['id'],
        description: formValue.description,
        authenticationConfig: formValue.authenticationConfig,
        credentialConfigIds: formValue.credentialConfigIds,
        batchSize: formValue.batchSize,
        dPopRequired: formValue.dPopRequired,
        notifyWebhook: formValue.notifyWebhook.url ? formValue.notifyWebhook : null,
        claimsWebhook: formValue.claimsWebhook.url ? formValue.claimsWebhook : null,
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

  getFormGroup(controlName: string): FormGroup {
    return this.form.get(controlName) as FormGroup;
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
    currentConfig.id = this.route.snapshot.params['id'];
    currentConfig.credentialConfigs = this.form.get('selectedCredentialConfigs')?.value || [];

    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Complete Configuration JSON',
        jsonData: currentConfig,
        readonly: false,
        schema: issuanceConfigSchema,
      },
      disableClose: false,
      height: '80vh',
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
