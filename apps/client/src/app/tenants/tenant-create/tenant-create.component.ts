import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { tenantControllerInitTenant } from '../../generated';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Role, roles } from '../../services/jwt.service';

@Component({
  selector: 'app-tenant-create',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FlexLayoutModule,
    MatSelectModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './tenant-create.component.html',
  styleUrl: './tenant-create.component.scss',
})
export class TenantCreateComponent {
  tenantForm: FormGroup;
  isSubmitting = false;

  roles = roles;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.tenantForm = this.fb.group({
      id: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      roles: new FormControl<Role[]>(['clients:manage'], [Validators.required]),
    });
  }

  async onSubmit(): Promise<void> {
    if (this.tenantForm.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      await tenantControllerInitTenant<true>({ body: this.tenantForm.value });
      this.snackBar.open('Tenant created successfully', 'Close', { duration: 3000 });
      await this.router.navigate(['../', this.tenantForm.value.id], { relativeTo: this.route });
    } catch (error) {
      this.snackBar.open(
        error instanceof Error ? error.message : 'Failed to create tenant',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
