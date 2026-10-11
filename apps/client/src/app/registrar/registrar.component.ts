import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { RegistrarConfig, RegistrarConfigRequest, RegistrarService } from './registrar.service';
import { registrarBaseUrlValidator } from './registrar-url.validator';
import { ConfigOwnershipDirective } from '../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../config-portability/config-ownership-notice.component';
import { getApiErrorMessage } from '../utils/error-message';

/** What to do when the instance's outbound URL policy blocks a URL. */
const POLICY_HINT =
  "Check the URL; if it is correct, ask the operator to allow it in this instance's outbound URL policy.";

/** What to do when the policy check could not resolve the host. */
const DNS_HINT = 'Check the host name, or try again later.';

/** Snackbar text when other issues were shown at the fields. */
const INPUT_HINT = 'Please correct the highlighted fields';

/** The hint for an outbound URL policy rejection, by its reason. */
function policyHint(message: string): string {
  return message.includes('cannot be resolved') ? DNS_HINT : POLICY_HINT;
}

/** Registration certificate defaults the form edits. */
const DEFAULTS_FIELDS = ['privacy_policy', 'support_uri', 'intermediary'];

/** Fields checked against the registrar base URL rule. */
const URL_FIELDS = ['registrarUrl', 'oidcUrl'] as const;

interface RegistrarPreset {
  name: string;
  registrarUrl: string;
  oidcUrl: string;
  clientId: string;
  clientSecret?: string;
}

@Component({
  selector: 'app-registrar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
  ],
  templateUrl: './registrar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './registrar.component.scss',
})
export class RegistrarComponent implements OnInit {
  configForm: FormGroup;
  config: RegistrarConfig | null = null;
  selectedPreset = '';

  isLoading = true;
  /**
   * Why the configuration could not be loaded. The form stays hidden then:
   * an empty form would look like no configuration, and saving it would
   * replace the stored one.
   */
  loadError: string | null = null;
  isSaving = false;
  showPassword = false;

  readonly presets: RegistrarPreset[] = [
    {
      name: 'German Sandbox',
      registrarUrl: 'https://sandbox.eudi-wallet.org/api',
      oidcUrl: 'https://auth.sandbox.eudi-wallet.org/realms/sandbox-registrar',
      clientId: 'swagger',
    },
  ];

  constructor(
    private readonly registrarService: RegistrarService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder
  ) {
    this.configForm = this.fb.group({
      registrarUrl: ['', [Validators.required, registrarBaseUrlValidator]],
      oidcUrl: ['', [Validators.required, registrarBaseUrlValidator]],
      clientId: ['', [Validators.required]],
      clientSecret: [''],
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      registrationCertificateDefaults: this.fb.group({
        privacy_policy: [''],
        support_uri: [''],
        intermediary: [''],
      }),
    });
    for (const url of URL_FIELDS) {
      this.configForm.get(url)?.valueChanges.subscribe(() => this.updateCredentialValidators());
    }
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    try {
      this.config = await this.registrarService.getConfig();

      if (this.config) {
        this.configForm.patchValue({
          registrarUrl: this.config.registrarUrl,
          oidcUrl: this.config.oidcUrl,
          clientId: this.config.clientId,
          clientSecret: '', // Never returned; user must enter a new one to change it
          username: this.config.username,
          password: '', // Password is never returned; user must enter new one to change it
          registrationCertificateDefaults: {
            privacy_policy:
              typeof this.config.registrationCertificateDefaults?.['privacy_policy'] === 'string'
                ? this.config.registrationCertificateDefaults?.['privacy_policy']
                : '',
            support_uri:
              typeof this.config.registrationCertificateDefaults?.['support_uri'] === 'string'
                ? this.config.registrationCertificateDefaults?.['support_uri']
                : '',
            intermediary:
              typeof this.config.registrationCertificateDefaults?.['intermediary'] === 'string'
                ? this.config.registrationCertificateDefaults?.['intermediary']
                : '',
          },
        });
        this.updateCredentialValidators();
        // A URL stored before the base URL rule shows its error right away.
        for (const field of URL_FIELDS) {
          const control = this.configForm.get(field);
          if (control?.invalid) control.markAsTouched();
        }
      }
    } catch (error) {
      console.error('Error loading registrar data:', error);
      this.loadError = getApiErrorMessage(
        (error as { error?: unknown })?.error,
        'Failed to load registrar data'
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Whether the input itself is invalid. A rejection by the backend does not
   * count: its cause may have been fixed outside the form, so saving again is
   * allowed and checks the URL anew.
   */
  get hasInvalidInput(): boolean {
    return Object.values(this.configForm.controls).some((control) =>
      Object.keys(control.errors ?? {}).some((key) => key !== 'server')
    );
  }

  /**
   * The backend keeps the stored password and client secret only while the
   * registrar URL and OIDC URL stay the same. A changed URL therefore
   * replaces the whole configuration.
   */
  get urlsChanged(): boolean {
    // The group value lags behind while a control emits valueChanges.
    const { registrarUrl, oidcUrl } = this.configForm.getRawValue();
    return (
      this.config !== null &&
      (registrarUrl !== this.config.registrarUrl || oidcUrl !== this.config.oidcUrl)
    );
  }

  /** Require the password unless the stored one is kept. */
  private updateCredentialValidators(): void {
    const password = this.configForm.get('password');
    password?.setValidators(
      !this.config?.hasPassword || this.urlsChanged ? [Validators.required] : []
    );
    password?.updateValueAndValidity({ emitEvent: false });
  }

  async saveConfig(): Promise<void> {
    if (this.hasInvalidInput) {
      this.configForm.markAllAsTouched();
      this.snackBar.open(INPUT_HINT, 'Close', { duration: 3000 });
      return;
    }
    // Drop the previous backend rejections; the backend checks again.
    for (const control of Object.values(this.configForm.controls)) {
      if (control.hasError('server')) control.updateValueAndValidity();
    }

    const formValue = this.configForm.value;
    const isUpdate = this.config !== null;

    this.isSaving = true;
    try {
      const configRequest = this.buildRequest(formValue);
      if (isUpdate && !this.urlsChanged) {
        // Use PATCH for updates. The URLs are unchanged, so leave them out:
        // URLs changed elsewhere since loading would otherwise be rejected
        const changes: Partial<RegistrarConfigRequest> = { ...configRequest };
        delete changes.registrarUrl;
        delete changes.oidcUrl;
        this.config = await this.registrarService.updateConfig(changes);
      } else {
        // Use POST for a new config or new URLs: it replaces the stored
        // credentials, and an empty client secret removes the stored one
        this.config = await this.registrarService.saveConfig(configRequest);
      }
      this.updateCredentialValidators();
      this.snackBar.open('Configuration saved successfully', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Error saving config:', error);
      const message =
        this.showFieldErrors(error.error?.errors) ??
        (error.error?.message || 'Failed to save configuration');
      this.snackBar.open(message, 'Close', { duration: 8000 });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * The request body for POST (a new configuration or new URLs) and PATCH.
   * The password is only sent when one was entered. Certificate defaults the form does not show,
   * such as ones set through the API, are kept; empty defaults are sent as
   * null.
   */
  private buildRequest(formValue: any): RegistrarConfigRequest {
    const configRequest: RegistrarConfigRequest = {
      registrarUrl: formValue.registrarUrl,
      oidcUrl: formValue.oidcUrl,
      clientId: formValue.clientId,
      clientSecret: formValue.clientSecret || undefined,
      username: formValue.username,
    };

    const defaultsGroup = formValue.registrationCertificateDefaults || {};
    // The PATCH replaces the stored defaults as a whole.
    const registrationCertificateDefaults: Record<string, unknown> = {
      ...this.config?.registrationCertificateDefaults,
    };
    for (const key of DEFAULTS_FIELDS) {
      const value = defaultsGroup[key]?.trim();
      if (value) registrationCertificateDefaults[key] = value;
      else delete registrationCertificateDefaults[key];
    }
    configRequest.registrationCertificateDefaults =
      Object.keys(registrationCertificateDefaults).length > 0
        ? registrationCertificateDefaults
        : null;

    if (formValue.password) {
      configRequest.password = formValue.password;
    }
    return configRequest;
  }

  /**
   * Puts the backend's validation issues on the matching form fields, so a
   * rejected URL is shown where it was entered. Editing the field clears it.
   * An outbound URL policy rejection gets a hint on what to do, since a typo
   * can cause it but otherwise only the operator can change the policy.
   * @returns the snackbar text, or null when no issue was shown at a field
   */
  private showFieldErrors(issues: unknown): string | null {
    if (!Array.isArray(issues)) return null;
    let policyMessage: string | null = null;
    let shown = false;
    for (const issue of issues) {
      const field = issue?.path?.[0];
      const control = typeof field === 'string' ? this.configForm.get(field) : null;
      // Only input fields have a place to show the error.
      if (control instanceof FormControl && typeof issue.message === 'string') {
        const hint = issue.code === 'outbound_url_policy' ? policyHint(issue.message) : null;
        control.setErrors({ server: hint ? `${issue.message}. ${hint}` : issue.message });
        control.markAsTouched();
        policyMessage = hint ?? policyMessage;
        shown = true;
      }
    }
    if (!shown) return null;
    return policyMessage ?? INPUT_HINT;
  }

  async deleteConfig(): Promise<void> {
    if (!confirm('Are you sure you want to delete the registrar configuration?')) {
      return;
    }

    this.isSaving = true;
    try {
      await this.registrarService.deleteConfig();
      this.config = null;
      this.configForm.reset();
      this.updateCredentialValidators();
      this.snackBar.open('Configuration deleted', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error deleting config:', error);
      this.snackBar.open('Failed to delete configuration', 'Close', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  get hasConfig(): boolean {
    return this.config !== null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  applyPreset(presetName: string): void {
    const preset = this.presets.find((p) => p.name === presetName);
    if (preset) {
      this.configForm.patchValue({
        registrarUrl: preset.registrarUrl,
        oidcUrl: preset.oidcUrl,
        clientId: preset.clientId,
        clientSecret: preset.clientSecret || '',
      });
      this.snackBar.open(
        `Applied "${preset.name}" preset. Please enter your credentials.`,
        'Close',
        {
          duration: 3000,
        }
      );
    }
  }
}
