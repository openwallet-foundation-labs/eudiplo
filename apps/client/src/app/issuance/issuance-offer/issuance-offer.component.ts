
import { ChangeDetectorRef, Component, type OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
  FormsModule,
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
import { CredentialConfig, type OfferRequestDto } from '../../generated';
import { IssuanceConfigService } from '../issuance-config/issuance-config.service';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import { CredentialConfigService } from '../credential-config/credential-config.service';
import { FormlyFieldConfig, FormlyFieldProps, FormlyForm } from '@ngx-formly/core';
import { MatDividerModule } from '@angular/material/divider';
import { JsonViewDialogComponent } from '../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { WebhookConfigShowComponent } from '../../utils/webhook-config-show/webhook-config-show.component';

@Component({
  selector: 'app-issuance-offer',
  imports: [
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
    FormlyForm,
    MatDividerModule,
    MatDialogModule,
    MatRadioModule,
    WebhookConfigShowComponent
],
  templateUrl: './issuance-offer.component.html',
  styleUrls: ['./issuance-offer.component.scss'],
})
export class IssuanceOfferComponent implements OnInit {
  getFields(arg0: FormlyFieldConfig<FormlyFieldProps & Record<string, any>>) {
    return [arg0];
  }
  form: FormGroup;
  loading = false;
  generatingOffer = false;

  formValues = new FormGroup({});
  fields: FormlyFieldConfig<FormlyFieldProps & Record<string, any>>[] = [];
  model: any = {};

  elements: {
    id: string;
    claims?: any;
    claimsWebhook?: any;
    claimSource: string; // 'form' or 'webhook'
  }[] = [];
  credentialConfigs: CredentialConfig[] = [];

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private snackBar: MatSnackBar,
    private router: Router,
    private formlyJsonschema: FormlyJsonschema,
    private credentialConfigService: CredentialConfigService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.form = new FormGroup({
      credentialConfigurationIds: new FormControl([], Validators.required),
      claims: new FormGroup({}),
      flow: new FormControl('authorization_code', Validators.required),
      tx_code: new FormControl(''),
    } as { [k in keyof OfferRequestDto]: any });
    //this.group = this.form.get('claims') as UntypedFormGroup;
  }

  async ngOnInit(): Promise<void> {
    this.form
      .get('credentialConfigurationIds')
      ?.valueChanges.subscribe((ids) => this.setClaimFormFields(ids));

    this.credentialConfigs = await this.credentialConfigService.loadConfigurations();
  }

  async setClaimFormFields(credentialConfigIds: string[]) {
    // Clean up existing form controls that are no longer selected
    const claimsGroup = this.form.get('claims') as FormGroup;
    const existingIds = Object.keys(claimsGroup.controls);

    for (const existingId of existingIds) {
      if (!credentialConfigIds.includes(existingId)) {
        claimsGroup.removeControl(existingId);
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

      // Generate form fields from schema
      if (config?.schema) {
        this.fields.push(this.formlyJsonschema.toFieldConfig(config.schema as any));
      } else {
        this.fields.push({} as any); // Empty field config as fallback
      }

      this.elements.push({
        id,
        claims: config!.claims, // Optional default values for pre-filling the form
        claimsWebhook: config!.claimsWebhook, // Optional webhook configuration
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

      const claimsGroup = this.form.get('claims') as FormGroup;

      if (source === 'webhook') {
        // Remove form control when switching to webhook
        if (claimsGroup.contains(elementId)) {
          claimsGroup.removeControl(elementId);
        }
      } else {
        // Add form control when switching to form
        if (!claimsGroup.contains(elementId)) {
          claimsGroup.addControl(elementId, new UntypedFormGroup({}));
        }
      }
    }
  }

  getForm(id: string) {
    return this.form.get(`claims.${id}`) as UntypedFormGroup;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.generatingOffer = true;

    try {
      const formValue = this.form.value;

      // Process claims based on selected source
      const processedClaims: any = {};
      for (const element of this.elements) {
        if (element.claimSource === 'form') {
          // Use form input data
          processedClaims[element.id] = formValue.claims[element.id];
        }
        // If claimSource is 'webhook', we don't include claims in the request
        // The backend will fetch them from the webhook
      }

      const offerRequest: OfferRequestDto = {
        flow: formValue.flow || 'authorization_code',
        response_type: 'uri', // Always use URI
        credentialConfigurationIds: formValue.credentialConfigurationIds,
        claims: Object.keys(processedClaims).length > 0 ? processedClaims : undefined,
        ...(formValue.flow === 'pre_authorized_code' && formValue.tx_code
          ? { tx_code: formValue.tx_code }
          : {}),
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
    this.form.get('claims')?.patchValue({ [form.id]: form.claims });
  }

  importClaims() {
    const currentConfig = this.form.get('claims')?.value;

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
        this.form.get('claims')?.patchValue({ [key]: result });
      }
    });
  }

  resetForm(): void {
    this.form.reset({
      credentialConfigurationIds: [],
    });
  }
}
