import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { clientControllerCreateClient } from '../../generated';
import { Role } from '../../services/jwt.service';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-client-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FlexLayoutModule,
    MatSelectModule,
    RouterModule,
    MatTooltipModule,
  ],
  templateUrl: './client-create.component.html',
  styleUrl: './client-create.component.scss',
})
export class ClientCreateComponent {
  clientForm: FormGroup;
  isSubmitting = false;
  hasPermission = false;

  roles: Role[] = [
    'clients:manage',
    'issuance:manage',
    'issuance:offer',
    'presentation:manage',
    'presentation:offer',
  ];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.clientForm = this.fb.group({
      clientId: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      roles: [[], [Validators.required]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.clientForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    console.log('call');

    try {
      await clientControllerCreateClient({
        body: this.clientForm.value,
      });
      this.snackBar.open('Client created successfully', 'Close', { duration: 3000 });
      await this.router.navigate(['..'], { relativeTo: this.route });
    } catch (error) {
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
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
