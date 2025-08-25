import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  ValidationErrors,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MonacoEditorModule, NgxEditorModel } from 'ngx-monaco-editor-v2';
import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { Component, forwardRef, OnChanges, Input, SimpleChanges } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { SchemaValidation } from '../schemas';
import schemas from '../schemas.json';

/**
 * extact the schema that got added by the editor
 */
export function extractSchema(obj: any) {
  if (!obj) return null;
  const element = typeof obj === 'string' ? JSON.parse(obj) : obj;
  delete element.$schema;
  if (Object.keys(element).length === 0) {
    return null;
  }
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
    addFormats(this.ajv);
    for (const schema of schemas) {
      const key = (schema.schema as any)['$id'].split('/').pop() || '';
      try {
        this.ajv.addSchema(schema.schema, key);
      } catch (error) {
        console.error(`Failed to add schema ${key}:`, error);
      }
    }
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
      if (!obj) {
        parsed = {};
      }
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
  validate(): ValidationErrors | null {
    if (this.editorOptions.language !== 'json') {
      return null;
    }

    const raw = this.value;
    if (!raw) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { invalidJson: true };
    }

    //if only the schema is included, return null
    if (Object.keys(parsed).length === 1 && parsed.$schema) {
      return null;
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
      try {
        this.validateFn = this.ajv.getSchema(this.schema?.getSchemaUrl());
      } catch (error) {
        console.log(error);
        this.validateFn = undefined;
      }
      this._validatorChange?.();
    }
  }

  private _onChange: (v: any) => void = () => {};
  private _onTouched: () => void = () => {};
  private _validatorChange?: () => void;
}
