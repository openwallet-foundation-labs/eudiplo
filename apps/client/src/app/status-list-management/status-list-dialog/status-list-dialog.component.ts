import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { StatusListManagementService } from '../status-list-management.service';
import { StatusListResponseDto, CredentialConfig, CertEntity } from '@eudiplo/sdk';

export interface StatusListDialogData {
  mode: 'create' | 'edit';
  list?: StatusListResponseDto;
  credentialConfigs: CredentialConfig[];
  certificates: CertEntity[];
}

@Component({
  selector: 'app-status-list-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FlexLayoutModule,
  ],
  templateUrl: './status-list-dialog.component.html',
  styleUrl: './status-list-dialog.component.scss',
})
export class StatusListDialogComponent {
  form: FormGroup;
  isSaving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<StatusListDialogComponent>,
    private readonly statusListService: StatusListManagementService,
    @Inject(MAT_DIALOG_DATA) public data: StatusListDialogData
  ) {
    this.form = this.fb.group({
      credentialConfigurationId: [data.list?.credentialConfigurationId ?? null],
      certId: [data.list?.certId ?? null],
    });
  }

  async onSubmit(): Promise<void> {
    this.isSaving = true;
    try {
      const formValue = this.form.value;
      const dto = {
        credentialConfigurationId: formValue.credentialConfigurationId || undefined,
        certId: formValue.certId || undefined,
      };

      let result: StatusListResponseDto;
      if (this.data.mode === 'create') {
        result = await this.statusListService.createList(dto);
      } else {
        result = await this.statusListService.updateList(this.data.list!.id, dto);
      }
      this.dialogRef.close(result);
    } catch (error) {
      console.error('Error saving status list:', error);
      // Let the parent component handle the error
      throw error;
    } finally {
      this.isSaving = false;
    }
  }
}
