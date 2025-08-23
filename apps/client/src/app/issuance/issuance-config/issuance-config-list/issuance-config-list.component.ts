import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { IssuanceConfig } from '../../../generated';
import { IssuanceConfigService } from '../issuance-config.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-issuance-config-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './issuance-config-list.component.html',
  styleUrl: './issuance-config-list.component.scss',
})
export class IssuanceConfigListComponent implements OnInit {
  configs: IssuanceConfig[] = [];

  displayedColumns: (keyof IssuanceConfig | 'actions' | 'webhooks')[] = [
    'id',
    'description',
    'webhooks',
    'credentialConfigs',
    'authenticationConfig',
    'actions',
  ];

  constructor(private issuanceConfigService: IssuanceConfigService) {}

  ngOnInit(): void {
    this.issuanceConfigService.loadConfigurations().then((configs) => (this.configs = configs));
  }
}
