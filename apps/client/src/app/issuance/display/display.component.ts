import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import {
  FormArray,
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { displayControllerCreateDisplay, displayControllerGetDisplay } from '../../generated';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ImageFieldComponent } from '../../utils/image-field/image-field.component';

@Component({
  selector: 'app-display',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    FlexLayoutModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule,
    ImageFieldComponent,
  ],
  templateUrl: './display.component.html',
  styleUrls: ['./display.component.scss'],
})
export class DisplayComponent implements OnInit {
  form: FormGroup;
  @ViewChildren('logoFileInput') logoFileInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      value: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    });
  }

  ngOnInit() {
    displayControllerGetDisplay().then((data) => {
      const displays = (data.data as any).value || [];
      this.displays.clear();
      for (const entry of displays) {
        this.displays.push(
          this.fb.group({
            name: [entry.name, Validators.required],
            locale: [entry.locale, Validators.required],
            logo: this.fb.group({
              uri: [entry.logo?.uri || '', Validators.required],
              alt: [entry.logo?.alt || ''],
            }),
          })
        );
      }
    });
  }

  getControl(value: any) {
    return value as FormControl;
  }

  get displays(): FormArray {
    return this.form.get('value') as FormArray;
  }

  addDisplay() {
    const displayGroup = this.fb.group({
      name: ['', Validators.required],
      locale: ['', Validators.required],
      logo: this.fb.group({
        uri: ['', Validators.required],
        alt: [''],
      }),
    });
    this.displays.push(displayGroup);
  }

  removeDisplay(index: number) {
    this.displays.removeAt(index);
  }

  submit() {
    displayControllerCreateDisplay({ body: this.form.value })
      .then(() => {
        this.snackBar.open('Display saved successfully!', 'Close', { duration: 3000 });
      })
      .catch((error) => {
        this.snackBar.open(`Error creating display: ${error.message}`, 'Close', { duration: 3000 });
      });
  }
}
