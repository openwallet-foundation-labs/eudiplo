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
import { OfferResponse, PresentationConfig, PresentationRequest } from '../../generated';
import { SessionManagementService } from '../../session-management/session-management.service';
import { PresentationManagementService } from '../presentation-config/presentation-management.service';

@Component({
  selector: 'app-presentation-offer',
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
  templateUrl: './presentation-offer.component.html',
  styleUrl: './presentation-offer.component.scss',
})
export class PresentationOfferComponent implements OnInit {
  form: FormGroup;
  configs: PresentationConfig[] = [];
  loading = false;
  generatingOffer = false;
  offerResult: OfferResponse | null = null;
  qrCodeDataUrl: string | null = null;

  constructor(
    private presentationManagementService: PresentationManagementService,
    private sessionManagementService: SessionManagementService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = new FormGroup({
      requestId: new FormControl('', Validators.required),
    });
  }

  ngOnInit(): void {
    this.loadConfigurations();
  }

  async loadConfigurations(): Promise<void> {
    this.loading = true;
    try {
      this.configs = await this.presentationManagementService.loadConfigurations();
    } catch (error) {
      console.error('Error loading configurations:', error);
      this.snackBar.open('Failed to load presentation configurations', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.loading = false;
    }
  }

  get selectedConfig(): PresentationConfig | undefined {
    const selectedId = this.form.get('requestId')?.value;
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
      const offerRequest: PresentationRequest = {
        requestId: formValue.requestId,
        response_type: 'uri', // Always use URI
      };

      const result = await this.presentationManagementService.getOffer(offerRequest);
      this.offerResult = result || null;

      this.snackBar.open(
        'Presentation request generated successfully! Redirecting to session details...',
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
    } catch (error) {
      console.error('Error generating presentation request:', error);
      this.snackBar.open('Failed to generate presentation request', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.generatingOffer = false;
    }
  }

  resetForm(): void {
    this.form.reset({
      requestId: '',
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
    link.download = `qr-code-${this.offerResult?.session || 'presentation'}.png`;
    link.href = this.qrCodeDataUrl;
    link.click();
  }
}
