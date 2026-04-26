import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  userControllerCreateUser,
  userControllerGetUser,
  userControllerUpdateUser,
} from '@eudiplo/sdk-core';
import { JwtService, roles } from '../../services/jwt.service';

@Component({
  selector: 'app-user-create',
  imports: [
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
    MatCheckboxModule,
  ],
  templateUrl: './user-create.component.html',
})
export class UserCreateComponent implements OnInit {
  private readonly jwtService = inject(JwtService);

  userForm: FormGroup;
  isSubmitting = false;
  availableRoles = roles;
  loaded = false;
  id?: string | null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(1)]],
      email: ['', [Validators.email]],
      firstName: [''],
      lastName: [''],
      password: ['', [Validators.minLength(8)]],
      enabled: [true],
      roles: [[], [Validators.required]],
    });

    if (!this.jwtService.hasRole('tenants:manage')) {
      this.availableRoles = roles.filter((r) => r !== 'tenants:manage');
    }
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.loaded = true;
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      userControllerGetUser({ path: { id: this.id } }).then((res) => {
        if (!res.data) {
          this.snackBar.open('User not found', 'Close', { duration: 3000 });
          this.router.navigate(['../..'], { relativeTo: this.route });
          return;
        }

        this.userForm.patchValue({
          ...res.data,
          password: '',
        });
        this.userForm.get('username')?.disable();
      });
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting = true;

    try {
      const payload = this.userForm.getRawValue();

      if (this.loaded) {
        if (!payload.password) {
          delete payload.password;
        }

        await userControllerUpdateUser({
          path: { id: this.id! },
          body: payload,
        });
        this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
        await this.router.navigate(['..'], { relativeTo: this.route });
      } else {
        await userControllerCreateUser({ body: payload });
        this.snackBar.open('User created successfully', 'Close', { duration: 3000 });
        await this.router.navigate(['..'], { relativeTo: this.route });
      }
    } catch (error) {
      this.snackBar.open(
        error instanceof Error
          ? error.message
          : `Failed to ${this.loaded ? 'update' : 'create'} user`,
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
