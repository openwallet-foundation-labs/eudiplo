import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MonacoEditorModule, NgxEditorModel } from 'ngx-monaco-editor-v2';
import Ajv, { ValidateFunction } from 'ajv';
import { Component, forwardRef, OnChanges, Input, SimpleChanges } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { SchemaValidation } from '../schemas';

/**
 * extact the schema that got added by the editor
 */
export function extractSchema(obj: any) {
  const element = typeof obj === 'string' ? JSON.parse(obj) : obj;
  delete element.$schema;
  return element;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MonacoEditorModule, MatInputModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EditorComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => EditorComponent), multi: true },
  ],
})
export class EditorComponent implements ControlValueAccessor, Validator, OnChanges {
  @Input() schema?: SchemaValidation;
  @Input() editorOptions: any = { language: 'json', automaticLayout: true };
  @Input() errors?: ValidationErrors | null = null;

  model: NgxEditorModel;

  value = '';
  disabled = false;

  private ajv = new Ajv();
  private validateFn?: ValidateFunction;

  constructor() {
    this.model = {
      value: this.value,
      language: 'json',
      //uri: this.schema?.getUri(),
    };
  }

  // CVA
  writeValue(obj: any): void {
    if (this.schema) {
      let parsed = obj;
      if (typeof obj !== 'object') {
        parsed = JSON.parse(obj === '' ? '{}' : obj);
      }
      if (!parsed['$schema']) {
        parsed = {
          $schema: this.schema?.getSchemaUrl(),
          ...parsed,
        };
      }
      obj = JSON.stringify(parsed, null, 2);
    }

    this.value = obj == null ? '' : typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);

    this.model = {
      value: this.value,
      language: this.editorOptions.language,
      //uri: this.schema?.getUri(),
    };
  }
  registerOnChange = (fn: any) => (this._onChange = fn);
  registerOnTouched = (fn: any) => (this._onTouched = fn);
  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  // Validator
  validate(_: AbstractControl): ValidationErrors | null {
    const raw = this.value;
    if (!raw) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { invalidJson: true };
    }
    if (this.validateFn && !this.validateFn(parsed)) {
      const msg = this.ajv.errorsText(this.validateFn.errors || undefined, { separator: ' | ' });
      return { invalidSchema: msg || 'Schema validation failed' };
    }
    return null;
  }
  registerOnValidatorChange?(fn: () => void): void {
    this._validatorChange = fn;
  }

  // Handlers
  handleChange(newVal: string) {
    this.value = newVal;
    try {
      this._onChange(JSON.parse(newVal));
    } catch {
      this._onChange(newVal);
    }
  }
  onBlur() {
    this._onTouched();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('schema' in changes) {
      const candidate = this.schema?.getSchema() ?? this.schema;
      try {
        this.validateFn = candidate ? this.ajv.compile(candidate) : undefined;
      } catch {
        this.validateFn = undefined;
      }
      this._validatorChange?.();
    }
  }

  private _onChange: (v: any) => void = () => {};
  private _onTouched: () => void = () => {};
  private _validatorChange?: () => void;
}
