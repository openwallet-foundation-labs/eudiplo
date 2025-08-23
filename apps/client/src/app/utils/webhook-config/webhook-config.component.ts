import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FlexLayoutModule } from 'ngx-flexible-layout';

@Component({
  selector: 'app-webhook-config',
  imports: [MatInputModule, ReactiveFormsModule, MatSelectModule, FlexLayoutModule, MatIconModule],
  templateUrl: './webhook-config.component.html',
  styleUrl: './webhook-config.component.scss',
})
export class WebhookConfigComponent implements OnInit {
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
}
