import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeycloakService } from '../keycloak.service';
import { tenantControllerInitTenant } from '../../generated';

@Component({
  selector: 'app-client-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FlexLayoutModule,
  ],
  templateUrl: './client-create.component.html',
  styleUrl: './client-create.component.scss',
})
export class ClientCreateComponent {
  clientForm: FormGroup;
  isSubmitting = false;
  hasPermission = false;

  constructor(
    private fb: FormBuilder,
    private keycloakService: KeycloakService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.clientForm = this.fb.group({
      clientId: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
    });

    this.checkPermissions();
  }

  private checkPermissions(): void {
    this.hasPermission = this.keycloakService.hasClientManagementPermission();
    if (!this.hasPermission) {
      this.snackBar.open(
        'You do not have permission to create Keycloak clients. Required role: admin or client-admin',
        'Close',
        { duration: 5000 }
      );
      this.router.navigate(['/clients']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.clientForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const { clientId, description } = this.clientForm.value;

    try {
      await this.keycloakService.createClient(clientId, description);
      this.snackBar.open('Client created successfully', 'Close', { duration: 3000 });
      await tenantControllerInitTenant({ body: { id: clientId } });
      await this.router.navigate(['/clients']);
    } catch (error) {
      console.error('Error creating client:', error);
      this.snackBar.open(
        error instanceof Error ? error.message : 'Failed to create client',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/clients']);
  }
}
