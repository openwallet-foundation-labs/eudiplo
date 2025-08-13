import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { type IssuanceConfig, type OfferRequestDto, type OfferResponse } from '../../generated';
import { SessionManagementService } from '../../session-management/session-management.service';
import { IssuanceConfigService } from '../issuance-config/issuance-config.service';

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

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private sessionManagementService: SessionManagementService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = new FormGroup({
      issuanceId: new FormControl('', Validators.required),
      credentialConfigurationIds: new FormControl([]),
    });
  }

  ngOnInit(): void {
    this.loadConfigurations();
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
        this.router.navigate(['/session-management', this.offerResult!.session], {
          queryParams: {
            showQR: 'true',
            uri: this.offerResult!.uri,
            startPolling: 'true',
          },
        });
      }
    } catch (error) {
      console.error('Error generating offer:', error);
      this.snackBar.open('Failed to generate offer', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.generatingOffer = false;
    }
  }

  resetForm(): void {
    this.form.reset({
      issuanceId: '',
      credentialConfigurationIds: [],
    });
    this.offerResult = null;
    this.qrCodeDataUrl = null;
  }

  generateNewOffer(): void {
    this.offerResult = null;
    this.qrCodeDataUrl = null;
  }

  downloadQRCode(): void {
    if (!this.qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${this.offerResult?.session || 'offer'}.png`;
    link.href = this.qrCodeDataUrl;
    link.click();
  }
}
