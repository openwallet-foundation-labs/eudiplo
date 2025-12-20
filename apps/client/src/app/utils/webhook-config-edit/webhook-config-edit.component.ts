import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatAnchor } from '@angular/material/button';

export function createWebhookFormGroup(): FormGroup {
  return new FormGroup({
    url: new FormControl(''),
    auth: new FormGroup({
      type: new FormControl(''),
      config: new FormGroup({
        headerName: new FormControl(''),
        value: new FormControl(''),
      }),
    }),
  });
}

@Component({
  selector: 'app-webhook-config-edit',
  imports: [
    MatInputModule,
    ReactiveFormsModule,
    MatSelectModule,
    FlexLayoutModule,
    MatIconModule,
    MatAnchor,
  ],
  templateUrl: './webhook-config-edit.component.html',
  styleUrl: './webhook-config-edit.component.scss',
})
export class WebhookConfigEditComponent implements OnInit {
  @Input() group!: FormGroup;

  ngOnInit(): void {
    const authTypeControl = this.group.get('auth.type');
    const headerNameControl = this.group.get('auth.config.headerName');
    const valueControl = this.group.get('auth.config.value');

    if (authTypeControl) {
      authTypeControl.valueChanges.subscribe((type) => {
        if (type === 'apiKey') {
          headerNameControl?.setValidators([Validators.required]);
          valueControl?.setValidators([Validators.required]);
        } else {
          //TODO: should they also disappear?
          headerNameControl?.clearValidators();
          valueControl?.clearValidators();
        }
        headerNameControl?.updateValueAndValidity();
        valueControl?.updateValueAndValidity();
      });
    }
  }

  clearConfig() {
    this.group.reset();
  }
}
