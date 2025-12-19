import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { CredentialsService, StoredCredential } from '../services/credentials.service';

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
  credential: StoredCredential | null = null;

  constructor(
    private credentialsService: CredentialsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.credential = this.credentialsService.getCredential();
  }

  /**
   * Handle credential configuration selection
   */
  onCredentialSelect(credential: StoredCredential): void {
    this.credential = credential;
  }

  /**
   * Check if a credential is selected
   */
  isCredentialSelected(credential: StoredCredential): boolean {
    return this.credential?.id === credential.id;
  }

  /**
   * Proceed to verification/QR generation
   */
  continueToVerification(): void {
    if (!this.credential) {
      this.snackBar.open('Please select a connection configuration', 'Close', { duration: 3000 });
      return;
    }

    this.router.navigate(['/verify'], {
      state: { credential: this.credential }
    });
  }

  /**
   * Go back to import step
   */
  goBack(): void {
    this.router.navigate(['/import']);
  }
}
