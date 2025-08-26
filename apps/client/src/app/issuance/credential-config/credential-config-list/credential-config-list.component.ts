import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfig } from '../../../generated';
import { CredentialConfigService } from '../credential-config.service';
import { DisplayFormValue } from '../credential-config.types';

@Component({
  selector: 'app-credential-config-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './credential-config-list.component.html',
  styleUrl: './credential-config-list.component.scss',
})
export class CredentialConfigListComponent implements OnInit {
  configs: CredentialConfig[] = [];

  displayedColumns: (keyof CredentialConfig | 'description' | 'actions')[] = [
    'id',
    'description',
    'keyBinding',
    'lifeTime',
    'embeddedDisclosurePolicy',
    'statusManagement',
    'actions',
  ];

  constructor(private credentialConfigService: CredentialConfigService) {}

  ngOnInit(): void {
    this.credentialConfigService.loadConfigurations().then((configs) => (this.configs = configs));
  }

  getDescription(config: CredentialConfig): string {
    return (
      ((config.config as any).display as DisplayFormValue[])[0]?.description ||
      'No description available'
    );
  }
}
