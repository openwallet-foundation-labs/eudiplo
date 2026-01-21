import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeyEntity } from '@eudiplo/sdk-angular';
import { KeyManagementService } from '../key-management/key-management.service';
import { RegistrarConfig, RegistrarService } from './registrar.service';

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
  ],
  templateUrl: './registrar.component.html',
  styleUrl: './registrar.component.scss',
})
export class RegistrarComponent implements OnInit {
  configForm: FormGroup;
  config: RegistrarConfig | null = null;
  keys: KeyEntity[] = [];
  selectedKeyId = '';
  selectedPreset = '';

  isLoading = true;
  isSaving = false;
  isCreatingCert = false;
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
    private readonly keyManagementService: KeyManagementService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
    private readonly router: Router
  ) {
    this.configForm = this.fb.group({
      registrarUrl: ['', [Validators.required]],
      oidcUrl: ['', [Validators.required]],
      clientId: ['', [Validators.required]],
      clientSecret: [''],
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      const [config, keys] = await Promise.all([
        this.registrarService.getConfig(),
        this.keyManagementService.loadKeys(),
      ]);

      this.config = config;
      this.keys = keys;

      if (config) {
        this.configForm.patchValue({
          registrarUrl: config.registrarUrl,
          oidcUrl: config.oidcUrl,
          clientId: config.clientId,
          clientSecret: config.clientSecret || '',
          username: config.username,
          password: config.password,
        });
      }
    } catch (error) {
      console.error('Error loading registrar data:', error);
      this.snackBar.open('Failed to load registrar data', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  async saveConfig(): Promise<void> {
    if (this.configForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    try {
      const formValue = this.configForm.value;
      this.config = await this.registrarService.saveConfig({
        registrarUrl: formValue.registrarUrl,
        oidcUrl: formValue.oidcUrl,
        clientId: formValue.clientId,
        clientSecret: formValue.clientSecret || undefined,
        username: formValue.username,
        password: formValue.password,
      });
      this.snackBar.open('Configuration saved successfully', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Error saving config:', error);
      const message = error.error?.message || 'Failed to save configuration';
      this.snackBar.open(message, 'Close', { duration: 5000 });
    } finally {
      this.isSaving = false;
    }
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
      this.snackBar.open('Configuration deleted', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error deleting config:', error);
      this.snackBar.open('Failed to delete configuration', 'Close', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  async createAccessCertificate(): Promise<void> {
    if (!this.selectedKeyId) {
      this.snackBar.open('Please select a key', 'Close', { duration: 3000 });
      return;
    }

    this.isCreatingCert = true;
    try {
      const result = await this.registrarService.createAccessCertificate(this.selectedKeyId);
      this.snackBar.open('Access certificate created successfully', 'Close', {
        duration: 3000,
      });
      // Navigate to the certificate detail page
      await this.router.navigate(['/keys', this.selectedKeyId, 'certificate', result.certId]);
    } catch (error: any) {
      console.error('Error creating access certificate:', error);
      const message = error.error?.message || 'Failed to create access certificate';
      this.snackBar.open(message, 'Close', { duration: 5000 });
    } finally {
      this.isCreatingCert = false;
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
      this.snackBar.open(`Applied "${preset.name}" preset. Please enter your credentials.`, 'Close', {
        duration: 3000,
      });
    }
  }
}
