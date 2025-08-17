import { Component } from '@angular/core';
import { FieldArrayType } from '@ngx-formly/core';
import { FormlyField, FormlyValidationMessage } from '@ngx-formly/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';

@Component({
selector: 'formly-array-type',
template: `
<div class="mb-3">
  @if (props.label) {
    <legend>{{ props.label }}</legend>
  }
  @if (props.description) {
    <p>{{ props.description }}</p>
  }
  <div class="d-flex flex-row-reverse">
    <button mat-icon-button type="button" (click)="add()">
      <mat-icon>add</mat-icon>
    </button>
  </div>

  @if (showError && formControl.errors) {
    <div class="alert alert-danger" role="alert">
      <formly-validation-message [field]="field"></formly-validation-message>
    </div>
  }

  @for (field of field.fieldGroup; track field.id; let i = $index) {
    <div class="row align-items-start">
      <formly-field class="col" [field]="field"></formly-field>
      @if (field.props!['removable'] !== false) {
        <div class="col-2 text-right">
          <button mat-icon-button type="button" (click)="remove(i)">
            <mat-icon>remove</mat-icon>
          </button>
        </div>
      }
    </div>
  }
</div>
`,
standalone: true,
imports: [FormlyField, FormlyValidationMessage, MatButtonModule, MatIconModule, MatButtonModule],
})
export class ArrayTypeComponent extends FieldArrayType {}
