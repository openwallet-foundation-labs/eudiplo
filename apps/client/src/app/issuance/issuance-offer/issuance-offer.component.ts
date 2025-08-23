import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { type IssuanceConfig, type OfferRequestDto, type OfferResponse } from '../../generated';
import { IssuanceConfigService } from '../issuance-config/issuance-config.service';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import { CredentialConfigService } from '../credential-config/credential-config.service';
import { FormlyFieldConfig, FormlyFieldProps, FormlyForm } from '@ngx-formly/core';
import { MatDividerModule } from '@angular/material/divider';
import { JsonViewDialogComponent } from '../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-issuance-offer',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  ],
  templateUrl: './issuance-offer.component.html',
  styleUrls: ['./issuance-offer.component.scss'],
})
export class IssuanceOfferComponent implements OnInit {
  form: FormGroup;
  configs: IssuanceConfig[] = [];
  loading = false;
  generatingOffer = false;
  offerResult: OfferResponse | null = null;
  qrCodeDataUrl: string | null = null;

  formValues = new FormGroup({});
  fields: FormlyFieldConfig<FormlyFieldProps & Record<string, any>>[] = [];
  model: any = {};
  group: UntypedFormGroup;

  elements: any[] = [];
  selected: IssuanceConfig | undefined;

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private formlyJsonschema: FormlyJsonschema,
    private credentialConfigService: CredentialConfigService,
    private dialog: MatDialog
  ) {
    this.form = new FormGroup({
      issuanceId: new FormControl('', Validators.required),
      credentialConfigurationIds: new FormControl([], Validators.required),
      claimsForm: new FormGroup({}),
    });
    this.group = this.form.get('claimsForm') as UntypedFormGroup;
  }

  async ngOnInit(): Promise<void> {
    await this.loadConfigurations();
    this.form.get('issuanceId')?.valueChanges.subscribe(async (issuanceId) => {
      this.selected = this.configs.find((config) => config.id === issuanceId);
      const ids = this.selected?.credentialConfigs.map((config) => config.id) || [];
      this.form.get('credentialConfigurationIds')?.setValue(ids);
    });

    this.form
      .get('credentialConfigurationIds')
      ?.valueChanges.subscribe((ids) => this.setClaimFormFields(ids));

    if (this.route.snapshot.params['id']) {
      this.form.patchValue({ issuanceId: this.route.snapshot.params['id'] });
    }
  }

  async setClaimFormFields(credentialConfigIds: string[]) {
    this.elements = [];
    this.fields = [];
    if (this.selected?.claimsWebhook) {
      return;
    }
    for (const id of credentialConfigIds) {
      await this.credentialConfigService.getConfig(id).then((config) => {
        this.fields.push(this.formlyJsonschema.toFieldConfig(config!.schema as any));
        this.elements.push({
          id,
          claims: config!.claims,
        });
        (this.form.get('claimsForm') as FormGroup).addControl(id, new UntypedFormGroup({}));
      });
    }
  }

  getForm(id: string) {
    return this.form.get(`claimsForm.${id}`) as UntypedFormGroup;
  }

  async loadConfigurations(): Promise<void> {
    this.loading = true;
    try {
      this.configs = await this.issuanceConfigService.loadConfigurations();
    } catch (error) {
      console.error('Error loading configurations:', error);
      this.snackBar.open('Failed to load issuance configurations', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.loading = false;
    }
  }

  get selectedConfig(): IssuanceConfig | undefined {
    const selectedId = this.form.get('issuanceId')?.value;
    return this.configs.find((config) => config.id === selectedId);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.generatingOffer = true;
    this.offerResult = null;
    this.qrCodeDataUrl = null;

    try {
      const formValue = this.form.value;
      const offerRequest: OfferRequestDto = {
        issuanceId: formValue.issuanceId,
        response_type: 'uri', // Always use URI
        credentialConfigurationIds:
          formValue.credentialConfigurationIds?.length > 0
            ? formValue.credentialConfigurationIds
            : undefined,
        claims: formValue.claimsForm,
      };

      const result = await this.issuanceConfigService.getOffer(offerRequest);
      this.offerResult = result || null;

      this.snackBar.open(
        'Offer generated successfully! Redirecting to session details...',
        'Close',
        {
          duration: 2000,
          panelClass: ['success-snackbar'],
        }
      );

      // Redirect to session details page with QR code and polling enabled
      if (this.offerResult?.session) {
        this.router.navigate(['/session-management', this.offerResult!.session]);
      }
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
    this.form.get('claimsForm')?.patchValue({ [form.id]: form.claims });
  }

  importClaims() {
    const currentConfig = this.form.get('claimsForm')?.value;

    const key = Object.keys(currentConfig)[0];

    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Complete Configuration JSON',
        jsonData: Object.values(currentConfig)[0],
        readonly: false,
      },
      disableClose: false,
      maxWidth: '95vw',
      maxHeight: '95vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.form.get('claimsForm')?.patchValue({ [key]: result });
      }
    });
  }

  resetForm(): void {
    this.form.reset({
      issuanceId: '',
      credentialConfigurationIds: [],
    });
    this.offerResult = null;
    this.qrCodeDataUrl = null;
  }
}
