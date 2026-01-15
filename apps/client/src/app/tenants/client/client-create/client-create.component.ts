import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  ApiService,
  clientControllerCreateClient,
  clientControllerGetClient,
  clientControllerUpdateClient,
} from '@eudiplo/sdk-angular';
import { roles } from '../../../services/jwt.service';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-client-create',
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
  ],
  templateUrl: './client-create.component.html',
  styleUrl: './client-create.component.scss',
})
export class ClientCreateComponent implements OnInit {
  clientForm: FormGroup;
  isSubmitting = false;
  hasPermission = false;

  roles = roles;
  loaded = false;
  id?: string | null;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {
    this.clientForm = this.fb.group({
      clientId: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      roles: [[], [Validators.required]],
    });
  }
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.loaded = true;
      clientControllerGetClient({ path: { id: this.id } }).then((res) => {
        if (!res.data) {
          this.snackBar.open('Client not found', 'Close', { duration: 3000 });
          this.router.navigate(['../..'], { relativeTo: this.route });
          return;
        }
        this.clientForm.patchValue(res.data);
        this.clientForm.get('clientId')?.disable();
      });
    }
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting = true;

    try {
      if (this.loaded) {
        await clientControllerUpdateClient({
          path: { id: this.id! },
          body: this.clientForm.value,
        });
      } else {
        await clientControllerCreateClient({
          body: this.clientForm.value,
        });
      }
      this.snackBar.open(`Client ${this.loaded ? 'updated' : 'created'} successfully`, 'Close', {
        duration: 3000,
      });
      await this.router.navigate(['..'], { relativeTo: this.route });

      //in case user updated its own client, refresh the token
      if (this.apiService.getClientId() === this.id) {
        this.apiService.refreshAccessToken();
      }
    } catch (error) {
      this.snackBar.open(
        error instanceof Error
          ? error.message
          : `Failed to ${this.loaded ? 'update' : 'create'} client`,
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
