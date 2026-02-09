import { Component, type OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { FlexLayoutModule } from 'ngx-flexible-layout';
import { EnvironmentService } from '../services/environment.service';
import { ApiService } from '../core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    FlexLayoutModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hideClientSecret = true;
  isDevelopmentMode = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly environmentService: EnvironmentService
  ) {}

  ngOnInit(): void {
    this.isDevelopmentMode = this.environmentService.isDevelopment();

    // Check if user is already authenticated
    if (this.apiService.getAuthenticationStatus()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    console.log('Initializing login form');
    this.initializeForm();

    // Auto-login if all required params are provided via URL
    this.autoLoginIfParamsProvided();
  }

  private autoLoginIfParamsProvided(): void {
    const queryParams = this.route.snapshot.queryParams;

    // Check if all required params are in the URL
    if (queryParams['clientId'] && queryParams['clientSecret'] && queryParams['apiUrl']) {
      console.log('Auto-login: All credentials provided via URL');
      this.onSubmit();
    }
  }

  private initializeForm(): void {
    const env = this.environmentService.getEnvironment();
    const queryParams = this.route.snapshot.queryParams;

    // Priority order: URL params > environment values (in dev) > empty strings
    const getParamValue = (paramName: string, envValue: string): string => {
      // First check URL query parameters
      if (queryParams[paramName]) {
        return queryParams[paramName];
      }

      // Then check environment values if in development mode
      if (this.environmentService.isDevelopment() && envValue) {
        return envValue;
      }

      //check if defined in window
      if ((globalThis as any).env?.[paramName]) {
        return (globalThis as any).env[paramName];
      }

      // Default to empty string
      return '';
    };

    const defaultValues = {
      clientId: getParamValue('clientId', env.oidc.clientId),
      clientSecret: getParamValue('clientSecret', env.oidc.clientSecret),
      apiUrl: getParamValue('apiUrl', env.api.baseUrl),
    };

    this.loginForm = this.formBuilder.group({
      clientId: [defaultValues.clientId, [Validators.required, Validators.required]],
      clientSecret: [defaultValues.clientSecret, [Validators.required, Validators.required]],
      apiUrl: [defaultValues.apiUrl, [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    });

    // Log the source of values for debugging (only in development)
    if (this.environmentService.isDevelopment()) {
      console.log('Login form initialized with values from:', {
        fromUrl: Object.keys(queryParams).length > 0 ? queryParams : 'No URL params',
        fromEnv: 'Environment defaults used when URL params not available',
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;

      try {
        const formValue = this.loginForm.value;

        // Normalize the URL: remove trailing slashes
        const normalizedUrl = formValue.apiUrl.replace(/\/+$/, '');

        // Initialize the API service with OIDC credentials and base URL
        await this.apiService.login(formValue.clientId, formValue.clientSecret, normalizedUrl);

        // Attempt to refresh/get access token
        await this.apiService.refreshAccessToken();

        this.snackBar.open('Login successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });

        // Navigate to dashboard
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        console.error('Login failed:', error);

        // Provide specific error messages based on the error type
        let errorMessage = 'Login failed. ';
        if (error?.message?.includes('fetch') || error?.name === 'TypeError') {
          errorMessage += 'Could not connect to EUDIPLO. Check if the instance URL is correct and the server is running.';
        } else if (error?.status === 401 || error?.message?.includes('401')) {
          errorMessage += 'Invalid credentials. Please check your Client ID and Client Secret.';
        } else if (error?.status === 404 || error?.message?.includes('404')) {
          errorMessage += 'Endpoint not found. Please verify the EUDIPLO instance URL.';
        } else {
          errorMessage += 'Please check your credentials and instance URL.';
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 8000,
          panelClass: ['error-snackbar'],
        });
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((field) => {
      const control = this.loginForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} is required`;
    }

    if (field?.hasError('pattern')) {
      return `${this.getFieldDisplayName(fieldName)} must be a valid URL`;
    }

    if (field?.hasError('minlength')) {
      const requiredLength = field.errors?.['minlength']?.requiredLength;
      return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters long`;
    }

    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      oidcUrl: 'OIDC Discovery URL',
      clientId: 'Client ID',
      clientSecret: 'Client Secret',
      apiUrl: 'API URL',
    };
    return displayNames[fieldName] || fieldName;
  }

  toggleClientSecretVisibility(): void {
    this.hideClientSecret = !this.hideClientSecret;
  }

  /**
   * Generates a shareable URL with current form values as query parameters
   * Excludes clientSecret for security reasons
   */
  generateShareableUrl(): string {
    const baseUrl = globalThis.location.origin + globalThis.location.pathname;
    const formValue = this.loginForm.value;

    const params = new URLSearchParams();
    if (formValue.oidcUrl) params.set('oidcUrl', formValue.oidcUrl);
    if (formValue.clientId) params.set('clientId', formValue.clientId);
    if (formValue.apiUrl) params.set('apiUrl', formValue.apiUrl);
    // Note: We intentionally exclude clientSecret for security

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Copies the shareable URL to clipboard
   */
  async copyShareableUrl(): Promise<void> {
    try {
      const url = this.generateShareableUrl();
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Shareable URL copied to clipboard!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar'],
      });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      this.snackBar.open('Failed to copy URL to clipboard', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    }
  }
}
