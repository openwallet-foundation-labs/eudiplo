import { Clipboard } from '@angular/cdk/clipboard';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

export interface KeyDownloadDialogData {
  keyConfig: {
    id: string;
    key: any;
    description?: string;
  };
}

@Component({
  selector: 'app-key-download-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FlexLayoutModule,
    MonacoEditorModule,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dialog-icon">warning</mat-icon>
      Save Your Private Key
    </h2>
    <mat-dialog-content>
      <div class="warning-banner">
        <mat-icon>error_outline</mat-icon>
        <div>
          <strong>Important Security Notice</strong>
          <p>
            The private key cannot be retrieved via the API after this dialog is closed. Please
            download or copy this configuration now if you need to back up the key or use it for
            configuration import.
          </p>
        </div>
      </div>

      <h4>Key Configuration (for config import)</h4>
      <ngx-monaco-editor
        class="editor"
        [options]="editorOptions"
        [(ngModel)]="formattedJson"
      ></ngx-monaco-editor>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="copyToClipboard()">
        <mat-icon>content_copy</mat-icon>
        Copy
      </button>
      <button mat-button (click)="download()">
        <mat-icon>download</mat-icon>
        Download
      </button>
      <button mat-flat-button (click)="close()">
        <mat-icon>check</mat-icon>
        Done
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './key-download-dialog.component.scss',
})
export class KeyDownloadDialogComponent {
  formattedJson: string;
  editorOptions = {
    language: 'json',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
  };

  constructor(
    public dialogRef: MatDialogRef<KeyDownloadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KeyDownloadDialogData,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar
  ) {
    // Format as the full key config structure
    const configData = {
      id: data.keyConfig.id,
      key: data.keyConfig.key,
      description: data.keyConfig.description,
    };
    this.formattedJson = JSON.stringify(configData, null, 2);
  }

  copyToClipboard(): void {
    this.clipboard.copy(this.formattedJson);
    this.snackBar.open('Key configuration copied to clipboard', 'Close', {
      duration: 3000,
    });
  }

  download(): void {
    const blob = new Blob([this.formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key-${this.data.keyConfig.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.snackBar.open('Key configuration downloaded', 'Close', {
      duration: 3000,
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
