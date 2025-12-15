import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CredentialsService, StoredCredential } from '../services/credentials.service';

@Component({
  standalone: true,
  selector: 'app-credentials-import',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './credentials-import.component.html',
  styleUrls: ['./credentials-import.component.scss'],
})
export class CredentialsImportComponent {
  credentials$;
  loading = false;
  dragActive = false;

  constructor(
    private credentialsService: CredentialsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.credentials$ = this.credentialsService.credentials$;
  }

  /**
   * Handle file drop
   */
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(): void {
    this.dragActive = false;
  }

  async onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    this.dragActive = false;

    const files = e.dataTransfer?.files;
    if (files) {
      await this.handleFiles(files);
    }
  }

  /**
   * Handle file input change
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      await this.handleFiles(input.files);
    }
  }

  /**
   * Process uploaded files
   */
  private async handleFiles(files: FileList): Promise<void> {
    this.loading = true;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          await this.credentialsService.addCredential(file);
          this.snackBar.open(`✓ ${file.name} imported`, 'Close', { duration: 3000 });
        } catch (err: any) {
          this.snackBar.open(`✗ Failed to import ${file.name}: ${err.message}`, 'Close', {
            duration: 5000,
          });
        }
      } else {
        this.snackBar.open(`✗ Skipped ${file.name} (JSON only)`, 'Close', { duration: 3000 });
      }
    }
    this.loading = false;
  }

  /**
   * Remove credential
   */
  removeCredential(id: string): void {
    this.credentialsService.removeCredential(id);
    this.snackBar.open('Credential removed', 'Close', { duration: 2000 });
  }

  /**
   * Navigate to next step
   */
  continueToConfig(): void {
    if (this.credentialsService.getCredentials().length > 0) {
      this.router.navigate(['/config']);
    } else {
      this.snackBar.open('Please import at least one credential', 'Close', { duration: 3000 });
    }
  }
}
