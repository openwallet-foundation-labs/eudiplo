import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

export interface JsonViewDialogData {
  title: string;
  jsonData: any;
  readonly?: boolean;
}

@Component({
  selector: 'app-json-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MonacoEditorModule,
  ],
  templateUrl: './json-view-dialog.component.html',
  styleUrl: './json-view-dialog.component.scss',
})
export class JsonViewDialogComponent {
  jsonControl = new FormControl('', [this.jsonValidator]);
  formattedJson: string;

  editorOptions = {
    language: 'json',
  };

  constructor(
    public dialogRef: MatDialogRef<JsonViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JsonViewDialogData,
    private snackBar: MatSnackBar
  ) {
    this.formattedJson = JSON.stringify(data.jsonData, null, 2);
    this.jsonControl.setValue(this.formattedJson);
    if (data.readonly) {
      this.jsonControl.disable();
    }
  }

  jsonValidator(control: any) {
    if (!control.value) return null;
    try {
      JSON.parse(control.value);
      return null;
    } catch {
      return { invalidJson: true };
    }
  }

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.jsonControl.value || '{}');
      const formatted = JSON.stringify(parsed, null, 2);
      this.jsonControl.setValue(formatted);
      this.snackBar.open('JSON formatted successfully', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Invalid JSON - cannot format', 'OK', { duration: 3000 });
    }
  }

  validateJson(): void {
    if (this.jsonControl.valid) {
      this.snackBar.open('JSON is valid', 'OK', { duration: 2000 });
    } else {
      this.snackBar.open('JSON is invalid', 'OK', { duration: 3000 });
    }
  }

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formattedJson);
      this.snackBar.open('JSON copied to clipboard', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to copy to clipboard', 'OK', { duration: 3000 });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.jsonControl.valid && this.jsonControl.value) {
      try {
        const parsedJson = JSON.parse(this.jsonControl.value);
        this.dialogRef.close(parsedJson);
      } catch {
        this.snackBar.open('Invalid JSON format', 'OK', { duration: 3000 });
      }
    }
  }
}
