import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { CredentialsService, CredentialType, StoredCredential } from '../services/credentials.service';

@Component({
  standalone: true,
  selector: 'app-presentation-config',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatListModule,
    MatSnackBarModule,
    FormsModule,
  ],
  templateUrl: './presentation-config.component.html',
  styleUrls: ['./presentation-config.component.scss'],
})
export class PresentationConfigComponent implements OnInit {
  availableCredentials: StoredCredential[] = [];
  selectedCredentialTypes: CredentialType[] = [];
  credentialTypeMap: Map<string, boolean> = new Map();

  constructor(
    private credentialsService: CredentialsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.availableCredentials = this.credentialsService.getCredentials();
    const selected = this.credentialsService.getSelectedCredentialTypes();
    this.selectedCredentialTypes = selected;

    // Initialize checkbox map
    this.availableCredentials.forEach((cred) => {
      const isSelected = selected.some((t) => t.format === cred.format);
      this.credentialTypeMap.set(cred.format, isSelected);
    });
  }

  /**
   * Handle credential type selection
   */
  onCredentialTypeChange(credential: StoredCredential, checked: boolean): void {
    const existingType = this.selectedCredentialTypes.find((t) => t.format === credential.format);

    if (checked && !existingType) {
      const credType: CredentialType = {
        id: credential.id,
        format: credential.format,
        name: credential.name,
      };
      this.selectedCredentialTypes.push(credType);
      this.credentialTypeMap.set(credential.format, true);
    } else if (!checked && existingType) {
      this.selectedCredentialTypes = this.selectedCredentialTypes.filter(
        (t) => t.format !== credential.format
      );
      this.credentialTypeMap.set(credential.format, false);
    }
  }

  /**
   * Check if a credential type is selected
   */
  isCredentialTypeSelected(format: string): boolean {
    return this.credentialTypeMap.get(format) || false;
  }

  /**
   * Proceed to verification/QR generation
   */
  continueToVerification(): void {
    if (this.selectedCredentialTypes.length === 0) {
      this.snackBar.open('Please select at least one credential type', 'Close', { duration: 3000 });
      return;
    }

    this.credentialsService.setRequiredCredentialTypes(this.selectedCredentialTypes);
    this.router.navigate(['/verify']);
  }

  /**
   * Go back to import step
   */
  goBack(): void {
    this.router.navigate(['/import']);
  }
}
