import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { PresentationConfig } from '../../../generated';
import { PresentationManagementService } from '../presentation-management.service';

@Component({
  selector: 'app-presentation-create',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './presentation-create.component.html',
  styleUrls: ['./presentation-create.component.scss'],
})
export class PresentationCreateComponent {
  public form: FormGroup;

  public create = true;

  constructor(
    private presentationService: PresentationManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = new FormGroup({
      id: new FormControl(undefined, [Validators.required]),
      dcql_query: new FormControl(undefined, [Validators.required, this.jsonValidator]),
      registrationCert: new FormControl(undefined), // Optional field
      webhook: new FormGroup({
        url: new FormControl(undefined), // Optional, but if filled, should be valid URL
        auth: new FormGroup({
          type: new FormControl(undefined), // Optional
          config: new FormGroup({
            headerName: new FormControl(undefined), // Optional
            value: new FormControl(undefined), // Optional
          }),
        }),
      }),
    } as { [k in keyof Omit<PresentationConfig, 'createdAt'>]: any });

    if (this.route.snapshot.params['id']) {
      this.presentationService
        .getPresentationById(this.route.snapshot.params['id'])
        .then((config) => {
          if (!config) {
            this.snackBar.open('Presentation not found', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['../'], { relativeTo: this.route });
            return;
          }

          // Convert dcql_query object to JSON string for form display
          const formData: any = { ...config };
          if (formData.dcql_query && typeof formData.dcql_query === 'object') {
            formData.dcql_query = JSON.stringify(formData.dcql_query, null, 2);
          }

          this.form.patchValue(formData);
          this.form.get('id')?.disable(); // Disable ID field in edit mode
          this.create = false;
        });
    }
  }

  // Custom validator for JSON format
  jsonValidator(control: any) {
    if (!control.value) return null; // Allow empty value

    try {
      JSON.parse(control.value);
      return null; // Valid JSON
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { invalidJson: true }; // Invalid JSON
    }
  }

  createOrUpdatePresentation(): void {
    if (this.form.valid) {
      // Parse the JSON string to an object for dcql_query
      const formValue = { ...this.form.value };

      // Convert dcql_query from string to object
      if (formValue.dcql_query) {
        try {
          formValue.dcql_query = JSON.parse(formValue.dcql_query);
        } catch (error) {
          console.error('Error parsing DCQL Query JSON:', error);
          return;
        }
      }

      if (!formValue.webhook.url) {
        formValue.webhook = undefined; // Remove webhook if URL is not provided
      }

      if (!formValue.registrationCert) {
        formValue.registrationCert = undefined; // Remove registrationCert if not provided
      }

      formValue.id = this.route.snapshot.params['id'] || formValue.id;

      // Use the same method for both create and update
      this.presentationService.createConfiguration(formValue).then(
        (res: any) => {
          if (this.create) {
            this.router.navigate(['../', res.id], { relativeTo: this.route });
            this.snackBar.open('Presentation created successfully', 'Close', {
              duration: 3000,
            });
          } else {
            this.router.navigate(['../'], { relativeTo: this.route });
            this.snackBar.open('Presentation updated successfully', 'Close', {
              duration: 3000,
            });
          }
        },
        (err: any) => alert(err.message)
      );
    }
  }

  // Helper method to format JSON for display
  formatJson(): void {
    const dcqlControl = this.form.get('dcql_query');
    if (dcqlControl?.value) {
      try {
        const parsed = JSON.parse(dcqlControl.value);
        const formatted = JSON.stringify(parsed, null, 2);
        dcqlControl.setValue(formatted);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Invalid JSON, don't format
      }
    }
  }

  // Helper method to insert example JSON
  insertExampleJson(): void {
    const exampleJson = {
      query: {
        credentials: [
          {
            type: 'VerifiableCredential',
            credentialSubject: {
              type: 'Person',
            },
          },
        ],
      },
    };

    this.form.get('dcql_query')?.setValue(JSON.stringify(exampleJson, null, 2));
  }
}
