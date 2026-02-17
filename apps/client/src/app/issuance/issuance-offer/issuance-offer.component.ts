import { ChangeDetectorRef, Component, ViewChild, type OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfig, type IssuanceConfig, type OfferRequestDto } from '@eudiplo/sdk-core';
import { IssuanceConfigService } from '../issuance-config/issuance-config.service';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import { CredentialConfigService } from '../credential-config/credential-config.service';
import { FormlyFieldConfig, FormlyFieldProps, FormlyModule } from '@ngx-formly/core';
import { MatDividerModule } from '@angular/material/divider';
import { JsonViewDialogComponent } from '../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { WebhookConfigShowComponent } from '../../utils/webhook-config-show/webhook-config-show.component';
import {
  WebhookConfigEditComponent,
  createWebhookFormGroup,
} from '../../utils/webhook-config-edit/webhook-config-edit.component';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';

/**
 * Custom validator to check that array has at least one element
 */
function arrayNotEmpty(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value || !Array.isArray(value) || value.length === 0) {
    return { required: true };
  }
  return null;
}

@Component({
  selector: 'app-issuance-offer',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
    FormlyModule,
    MatDividerModule,
    MatDialogModule,
    MatRadioModule,
    MatStepperModule,
    WebhookConfigShowComponent,
    WebhookConfigEditComponent,
  ],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true },
    },
  ],
  templateUrl: './issuance-offer.component.html',
  styleUrls: ['./issuance-offer.component.scss'],
})
export class IssuanceOfferComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  // Step form groups
  flowStepForm: FormGroup;
  credentialStepForm: FormGroup;
  configStepForm: FormGroup;

  form: FormGroup;
  loading = false;
  generatingOffer = false;

  formValues = new FormGroup({});
  fields: FormlyFieldConfig<FormlyFieldProps & Record<string, any>>[] = [];
  model: any = {};

  elements: {
    id: string;
    defaultClaims?: any; // Default claims from config for pre-filling
    webhookConfig?: any; // Webhook config from credential config
    claimSource: string; // 'form' or 'webhook'
  }[] = [];
  credentialConfigs: CredentialConfig[] = [];
  issuanceConfig?: IssuanceConfig;
  availableAuthServers: string[] = [];

  // IAE status tracking for selected credential configs
  selectedConfigsIaeStatus = new Map<string, boolean>();

  // Webhook FormGroups for external AS flow (keyed by credential config id)
  externalAsWebhooks = new Map<string, FormGroup>();

  /**
   * Returns the selected flow type
   */
  get selectedFlow(): string {
    return this.flowStepForm.get('flow')?.value || 'pre_authorized_code';
  }

  /**
   * Returns true if pre-authorized code flow is selected
   */
  get isPreAuthFlow(): boolean {
    return this.selectedFlow === 'pre_authorized_code';
  }

  /**
   * Returns true if authorization code flow with external AS is selected
   */
  get isAuthCodeExternalFlow(): boolean {
    return this.selectedFlow === 'authorization_code_external';
  }

  /**
   * Returns true if Chained AS is enabled in the issuance configuration
   */
  get isChainedAsEnabled(): boolean {
    return this.issuanceConfig?.chainedAs?.enabled === true;
  }

  /**
   * Returns the selected AS type ('external' or 'chained')
   */
  get selectedAsType(): string {
    return this.configStepForm.get('as_type')?.value || 'external';
  }

  /**
   * Returns true if chained AS is selected for the current flow
   */
  get isChainedAsSelected(): boolean {
    return this.isAuthCodeExternalFlow && this.selectedAsType === 'chained';
  }

  /**
   * Returns true if IAE flow (auth code with built-in AS) is selected
   */
  get isIaeFlow(): boolean {
    return this.selectedFlow === 'authorization_code_iae';
  }

  /**
   * Returns true if any authorization code flow is selected (external or IAE)
   */
  get isAuthCodeFlow(): boolean {
    return this.isAuthCodeExternalFlow || this.isIaeFlow;
  }

  /**
   * Returns credentials with IAE configured
   */
  get configsWithIae(): string[] {
    const selectedIds = this.credentialStepForm.get('credentialConfigurationIds')?.value || [];
    return selectedIds.filter((id: string) => this.selectedConfigsIaeStatus.get(id) === true);
  }

  /**
   * Returns credential configs available for selection based on the selected flow.
   * - Pre-auth flow: Only configs WITHOUT IAE
   * - Auth-code external flow: Only configs WITHOUT IAE (external AS handles auth)
   * - IAE flow: Only configs WITH IAE (built-in AS uses IAE)
   */
  get availableCredentialConfigs(): CredentialConfig[] {
    if (this.isIaeFlow) {
      // For IAE flow, only show configs WITH IAE
      return this.credentialConfigs.filter((config) => config.iaeActions?.length);
    }
    // For pre-auth and external AS flows, only show configs WITHOUT IAE
    return this.credentialConfigs.filter((config) => !config.iaeActions?.length);
  }

  /**
   * Returns true if there are credential configs available for the selected flow
   */
  get hasAvailableConfigs(): boolean {
    return this.availableCredentialConfigs.length > 0;
  }

  /**
   * Returns the webhook FormGroup for a specific credential config (external AS flow)
   */
  getWebhookFormGroup(configId: string): FormGroup | undefined {
    return this.externalAsWebhooks.get(configId);
  }

  /**
   * Returns true if all webhooks for external AS flow are valid
   */
  get allExternalAsWebhooksValid(): boolean {
    const selectedIds = this.credentialStepForm.get('credentialConfigurationIds')?.value || [];
    return selectedIds.every((id: string) => {
      const webhookForm = this.externalAsWebhooks.get(id);
      return webhookForm?.get('url')?.value; // At least URL must be set
    });
  }

  constructor(
    private readonly issuanceConfigService: IssuanceConfigService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly formlyJsonschema: FormlyJsonschema,
    private readonly credentialConfigService: CredentialConfigService,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef
  ) {
    // Step 1: Flow selection
    this.flowStepForm = new FormGroup({
      flow: new FormControl('pre_authorized_code', Validators.required),
    });

    // Step 2: Credential selection
    this.credentialStepForm = new FormGroup({
      credentialConfigurationIds: new FormControl([], [arrayNotEmpty]),
    });

    // Step 3: Flow-specific configuration (claims for pre-auth, AS for auth-code)
    this.configStepForm = new FormGroup({
      claims: new FormGroup({}),
      tx_code: new FormControl(''),
      tx_code_description: new FormControl(''),
      as_type: new FormControl('external'), // 'external' or 'chained'
      authorization_server: new FormControl(''),
    });

    // Legacy form reference (not used with stepper, kept for backward compatibility)
    this.form = new FormGroup({});
  }

  ngOnInit() {
    // Check for pre-fill data from navigation state (recreate offer flow)
    const prefillData = history.state?.offerRequest as OfferRequestDto | undefined;
    if (prefillData) {
      this.prefillFromOffer(prefillData);
    }

    // Listen for credential config selection changes
    this.credentialStepForm
      .get('credentialConfigurationIds')
      ?.valueChanges.subscribe((ids) => this.setClaimFormFields(ids));

    // Reset configuration step when flow changes
    this.flowStepForm.get('flow')?.valueChanges.subscribe((flow) => {
      // Clear selected credential configs since available configs change based on flow
      this.credentialStepForm.patchValue({
        credentialConfigurationIds: [],
      });
      this.selectedConfigsIaeStatus.clear();
      this.externalAsWebhooks.clear();
      this.configStepForm.patchValue({
        // Default to chained AS if enabled, otherwise external
        as_type:
          flow === 'authorization_code_external' && this.isChainedAsEnabled
            ? 'chained'
            : 'external',
        // Pre-select first AS for external AS flow
        authorization_server:
          flow === 'authorization_code_external' && this.availableAuthServers.length > 0
            ? this.availableAuthServers[0]
            : '',
        tx_code: '',
      });
    });

    this.credentialConfigService
      .loadConfigurations()
      .then((response) => (this.credentialConfigs = response));

    // Load issuance config to get available auth servers
    this.issuanceConfigService.getConfig().then((config) => {
      this.issuanceConfig = config;
      this.availableAuthServers = config?.authServers || [];
    });
  }

  async setClaimFormFields(credentialConfigIds: string[]) {
    // Clean up existing form controls that are no longer selected
    const claimsGroup = this.configStepForm.get('claims') as FormGroup;
    const existingIds = Object.keys(claimsGroup.controls);

    for (const existingId of existingIds) {
      if (!credentialConfigIds.includes(existingId)) {
        claimsGroup.removeControl(existingId);
      }
    }

    // Update IAE status tracking for selected configs
    this.selectedConfigsIaeStatus.clear();
    for (const id of credentialConfigIds) {
      const config = this.credentialConfigs.find((cred) => cred.id === id);
      const hasIae = (config?.iaeActions?.length || 0) > 0;
      this.selectedConfigsIaeStatus.set(id, hasIae);
    }

    // Initialize webhook forms for external AS flow
    // Clean up removed configs
    for (const existingId of this.externalAsWebhooks.keys()) {
      if (!credentialConfigIds.includes(existingId)) {
        this.externalAsWebhooks.delete(existingId);
      }
    }
    // Add webhook forms for new configs
    for (const id of credentialConfigIds) {
      if (!this.externalAsWebhooks.has(id)) {
        const config = this.credentialConfigs.find((cred) => cred.id === id);
        const webhookGroup = createWebhookFormGroup();
        // Pre-fill with credential config's claimsWebhook if available
        if (config?.claimsWebhook) {
          webhookGroup.patchValue(config.claimsWebhook);
        }
        this.externalAsWebhooks.set(id, webhookGroup);
      }
    }

    this.elements = [];
    this.fields = [];

    for (const id of credentialConfigIds) {
      const config = this.credentialConfigs.find((cred) => cred.id === id);

      // Schema is always assumed to be available (form input is always possible)
      // claimsWebhook is optional (webhook input is only available if configured)
      // claims are optional default values to pre-fill the form

      // Default to form input (schema is always available)
      const defaultSource = 'form';

      // Generate form fields from schema (only needed for pre-auth flow)
      if (config?.schema) {
        this.fields.push(this.formlyJsonschema.toFieldConfig(config.schema as any));
      } else {
        this.fields.push({} as any); // Empty field config as fallback
      }

      this.elements.push({
        id,
        defaultClaims: config!.claims, // Optional default values for pre-filling the form
        webhookConfig: config!.claimsWebhook, // Optional webhook configuration
        claimSource: defaultSource,
      });

      // Only add form control if source is 'form' (not webhook) and it doesn't exist yet
      if (defaultSource === 'form' && !claimsGroup.contains(id)) {
        claimsGroup.addControl(id, new UntypedFormGroup({}));
      }
    }
    // Trigger change detection after modifications
    this.cdr.detectChanges();
  }

  /**
   * Updates the claim source for a specific credential configuration
   */
  onClaimSourceChange(elementId: string, source: string) {
    const element = this.elements.find((e) => e.id === elementId);
    if (element) {
      element.claimSource = source;

      const claimsGroup = this.configStepForm.get('claims') as FormGroup;

      if (source === 'webhook') {
        // Remove form control when switching to webhook
        if (claimsGroup.contains(elementId)) {
          claimsGroup.removeControl(elementId);
        }
        // Add form control when switching to form
      } else if (!claimsGroup.contains(elementId)) {
        claimsGroup.addControl(elementId, new UntypedFormGroup({}));
      }
    }
  }

  getForm(id: string) {
    return this.configStepForm.get(`claims.${id}`) as UntypedFormGroup;
  }

  getFields(arg0: FormlyFieldConfig<FormlyFieldProps & Record<string, any>>) {
    return [arg0];
  }

  async onSubmit(): Promise<void> {
    // Validate all step forms
    if (this.flowStepForm.invalid || this.credentialStepForm.invalid) {
      this.flowStepForm.markAllAsTouched();
      this.credentialStepForm.markAllAsTouched();
      this.configStepForm.markAllAsTouched();
      return;
    }

    this.generatingOffer = true;

    try {
      const flowSelection = this.flowStepForm.get('flow')?.value;
      const credentialConfigurationIds = this.credentialStepForm.get(
        'credentialConfigurationIds'
      )?.value;
      const configValue = this.configStepForm.value;

      // Map flow selection to actual flow type
      const flow =
        flowSelection === 'pre_authorized_code' ? 'pre_authorized_code' : 'authorization_code';

      // Build credentialClaims for pre-authorized code flow and external AS flow
      let credentialClaims: any = undefined;
      if (flowSelection === 'pre_authorized_code') {
        credentialClaims = {};
        for (const element of this.elements) {
          if (element.claimSource === 'form') {
            credentialClaims[element.id] = {
              type: 'inline',
              claims: configValue.claims[element.id],
            };
          } else if (element.claimSource === 'webhook') {
            credentialClaims[element.id] = {
              type: 'webhook',
              webhook: element.webhookConfig,
            };
          }
        }
      } else if (
        flowSelection === 'authorization_code_external' ||
        flowSelection === 'authorization_code_iae'
      ) {
        // For external AS and IAE flows, include webhook configuration for each credential (if configured)
        credentialClaims = {};
        for (const configId of credentialConfigurationIds) {
          const webhookForm = this.externalAsWebhooks.get(configId);
          if (webhookForm?.get('url')?.value) {
            const webhookValue = webhookForm.value;
            // Clean up empty auth values
            if (!webhookValue.auth?.type || webhookValue.auth?.type === 'none') {
              delete webhookValue.auth;
            }
            credentialClaims[configId] = {
              type: 'webhook',
              webhook: webhookValue,
            };
          }
        }
      }

      // Build authorization_server only for external AS flow when not using chained AS
      const authorizationServer =
        flowSelection === 'authorization_code_external' && configValue.as_type !== 'chained'
          ? configValue.authorization_server
          : undefined;

      const offerRequest: OfferRequestDto = {
        flow: flow || 'pre_authorized_code',
        response_type: 'uri',
        credentialConfigurationIds,
        credentialClaims:
          credentialClaims && Object.keys(credentialClaims).length > 0
            ? credentialClaims
            : undefined,
        ...(flowSelection === 'pre_authorized_code' && configValue.tx_code
          ? {
              tx_code: configValue.tx_code,
              ...(configValue.tx_code_description
                ? { tx_code_description: configValue.tx_code_description }
                : {}),
            }
          : {}),
        ...(authorizationServer ? { authorization_server: authorizationServer } : {}),
      };

      const result = await this.issuanceConfigService.getOffer(offerRequest);
      const offerResult = result || null;

      this.snackBar.open(
        'Offer generated successfully! Redirecting to session details...',
        'Close',
        {
          duration: 2000,
          panelClass: ['success-snackbar'],
        }
      );

      // Redirect to session details page with QR code and polling enabled
      this.router.navigate(['/session-management', offerResult!.session]);
    } catch (error: any) {
      this.snackBar.open(`Failed to generate offer: ${error.message}`, 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.generatingOffer = false;
    }
  }

  addPreConfigured(form: any) {
    this.configStepForm.get('claims')?.patchValue({ [form.id]: form.defaultClaims });
  }

  importClaims() {
    const currentConfig = this.configStepForm.get('claims')?.value;

    const key = Object.keys(currentConfig)[0];

    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Complete Configuration JSON',
        jsonData: Object.values(currentConfig)[0],
        readonly: false,
      },
      disableClose: true,
      minWidth: '60vw',
      maxWidth: '95vw',
      maxHeight: '95vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.configStepForm.get('claims')?.patchValue({ [key]: result });
      }
    });
  }

  resetForm(): void {
    this.flowStepForm.reset({ flow: 'pre_authorized_code' });
    this.credentialStepForm.reset({ credentialConfigurationIds: [] });
    this.configStepForm.reset({ tx_code: '', as_type: 'external', authorization_server: '' });
    this.elements = [];
    this.fields = [];
    this.selectedConfigsIaeStatus.clear();
    if (this.stepper) {
      this.stepper.reset();
    }
  }

  /**
   * Pre-fill the form from an existing offer request (recreate offer flow)
   */
  private async prefillFromOffer(offer: OfferRequestDto): Promise<void> {
    // Wait for credential configs to load
    await this.credentialConfigService.loadConfigurations().then((configs) => {
      this.credentialConfigs = configs;
    });

    // Set form values across all steps
    this.flowStepForm.patchValue({
      flow: offer.flow || 'pre_authorized_code',
    });

    this.credentialStepForm.patchValue({
      credentialConfigurationIds: offer.credentialConfigurationIds || [],
    });

    this.configStepForm.patchValue({
      tx_code: offer.tx_code || '',
      authorization_server: offer.authorization_server || '',
    });

    // Pre-fill claims after the form fields are generated (only for pre-auth flow)
    if (offer.credentialClaims && offer.flow === 'pre_authorized_code') {
      // Wait for form fields to be set up
      setTimeout(() => {
        for (const [credId, claimData] of Object.entries(offer.credentialClaims || {})) {
          const element = this.elements.find((e) => e.id === credId);
          if (element && claimData.type === 'inline') {
            element.claimSource = 'form';
            this.configStepForm.get('claims')?.patchValue({ [credId]: claimData.claims });
          } else if (element && claimData.type === 'webhook') {
            element.claimSource = 'webhook';
          }
        }
        this.cdr.detectChanges();
      }, 100);
    }

    this.snackBar.open('Form pre-filled from previous offer', 'Close', { duration: 2000 });
  }
}
