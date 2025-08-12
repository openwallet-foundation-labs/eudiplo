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
import { AuthenticationConfigDto, CredentialConfig, IssuanceDto } from '../../../generated';
import { CredentialConfigService } from '../../credential-config/credential-config.service';
import { IssuanceConfigService } from '../issuance-config.service';

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

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private credentialConfigService: CredentialConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = new FormGroup({
      id: new FormControl('', [Validators.required]),
      authMethod: new FormControl('none', [Validators.required]),
      authConfig: new FormControl(''),
      selectedCredentialConfigs: new FormControl([], [Validators.required]),
      batchSize: new FormControl(1, [Validators.min(1)]),
      webhookUrl: new FormControl(''),
      webhookAuth: new FormControl(''),
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

      // Extract authentication method and config
      const authMethod = this.getAuthMethodFromConfig(config.authenticationConfig);
      const authConfigStr =
        config.authenticationConfig && Object.keys(config.authenticationConfig).length > 0
          ? JSON.stringify(config.authenticationConfig, null, 2)
          : '';

      // Extract selected credential config IDs
      const selectedCredentialConfigs =
        config.credentialIssuanceBindings?.map((binding: any) => binding.credentialConfigId) || [];

      this.form.patchValue({
        id: config.id,
        authMethod: authMethod,
        authConfig: authConfigStr,
        selectedCredentialConfigs: selectedCredentialConfigs,
        batchSize: config.batch_size || 1,
        webhookUrl: config.notifyWebhook?.url || '',
        webhookAuth: config.notifyWebhook?.auth
          ? JSON.stringify(config.notifyWebhook.auth, null, 2)
          : '',
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

  private getAuthMethodFromConfig(authConfig: any): string {
    if (!authConfig || Object.keys(authConfig).length === 0) {
      return 'none';
    }
    if (authConfig.presentationDuringIssuance) {
      return 'presentationDuringIssuance';
    }
    if (authConfig.auth) {
      return 'auth';
    }
    return 'none';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    try {
      // Prepare authentication config
      const authenticationConfig: AuthenticationConfigDto = {
        method: formValue.authMethod,
      };

      if (formValue.authConfig && formValue.authConfig.trim()) {
        try {
          authenticationConfig.config = JSON.parse(formValue.authConfig);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          this.snackBar.open('Invalid authentication configuration JSON', 'Close', {
            duration: 3000,
          });
          this.loading = false;
          return;
        }
      }

      // Prepare credential config mappings
      const credentialConfigs = formValue.selectedCredentialConfigs.map((id: string) => ({
        id: id,
      }));

      // Prepare webhook config
      const notifyWebhook: any = {};
      if (formValue.webhookUrl) {
        notifyWebhook.url = formValue.webhookUrl;
        if (formValue.webhookAuth && formValue.webhookAuth.trim()) {
          try {
            notifyWebhook.auth = JSON.parse(formValue.webhookAuth);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            this.snackBar.open('Invalid webhook authentication JSON', 'Close', {
              duration: 3000,
            });
            this.loading = false;
            return;
          }
        }
      }

      const issuanceDto: IssuanceDto = {
        id: this.create ? formValue.id : this.route.snapshot.params['id'],
        authenticationConfig: authenticationConfig,
        credentialConfigs: credentialConfigs,
        batch_size: formValue.batchSize,
        notifyWebhook: Object.keys(notifyWebhook).length > 0 ? notifyWebhook : undefined,
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

  getAuthMethodLabel(method: string): string {
    switch (method) {
      case 'none':
        return 'Pre-authorized Code Flow (No Authentication)';
      case 'auth':
        return 'Authorized Code Flow (User Authentication)';
      case 'presentationDuringIssuance':
        return 'Presentation During Issuance (OID4VP)';
      default:
        return method;
    }
  }

  getSelectedCredentialConfigsDisplay(): string[] {
    const selectedIds = this.form.get('selectedCredentialConfigs')?.value || [];
    return selectedIds.map((id: string) => {
      const config = this.availableCredentialConfigs.find((c) => c.id === id);
      return config ? `${config.id} (${config.vct?.name || 'Unknown'})` : id;
    });
  }
}
