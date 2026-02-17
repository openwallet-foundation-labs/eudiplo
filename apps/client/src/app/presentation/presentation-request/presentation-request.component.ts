import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
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
import { OfferResponse, PresentationConfig, PresentationRequest } from '@eudiplo/sdk-core';
import { PresentationManagementService } from '../presentation-config/presentation-management.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EditorComponent, extractSchema } from '../../utils/editor/editor.component';
import { transactionDataArraySchema } from '../../utils/schemas';

@Component({
  selector: 'app-presentation-request',
  imports: [
    CommonModule,
    FormsModule,
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
    MatSlideToggleModule,
    EditorComponent,
  ],
  templateUrl: './presentation-request.component.html',
  styleUrl: './presentation-request.component.scss',
})
export class PresentationRequestComponent implements OnInit {
  form: FormGroup;
  configs: PresentationConfig[] = [];
  loading = false;
  generatingOffer = false;
  offerResult: OfferResponse | null = null;
  qrCodeDataUrl: string | null = null;
  showTransactionDataOverride = false;
  transactionDataArraySchema = transactionDataArraySchema;

  constructor(
    private presentationManagementService: PresentationManagementService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = new FormGroup({
      requestId: new FormControl('', Validators.required),
      dcapi: new FormControl(false),
      transaction_data: new FormControl(undefined),
    });
  }

  ngOnInit(): void {
    this.loadConfigurations();
  }

  async loadConfigurations(): Promise<void> {
    this.loading = true;
    try {
      this.configs = await this.presentationManagementService.loadConfigurations();
      if (this.route.snapshot.params['id']) {
        this.form.patchValue({ requestId: this.route.snapshot.params['id'] });
        //since we do not have any other values for now, we can submit the form
        this.onSubmit();
      }
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
    this.generatingOffer = true;
    this.offerResult = null;
    this.qrCodeDataUrl = null;

    try {
      const formValue = this.form.value;

      // Parse transaction_data if provided
      let transactionData = undefined;
      if (formValue.transaction_data) {
        try {
          transactionData = extractSchema(formValue.transaction_data);
        } catch (error) {
          console.error('Error parsing transaction_data JSON:', error);
          this.snackBar.open('Invalid transaction data JSON format', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar'],
          });
          this.generatingOffer = false;
          return;
        }
      }

      const offerRequest: PresentationRequest = {
        requestId: formValue.requestId,
        response_type: formValue.dcapi ? 'dc-api' : 'uri',
        ...(transactionData && { transaction_data: transactionData }),
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

  downloadQRCode(): void {
    if (!this.qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${this.offerResult?.session || 'presentation'}.png`;
    link.href = this.qrCodeDataUrl;
    link.click();
  }
}
