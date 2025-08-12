import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { IssuanceConfig } from '../../../generated';
import { IssuanceConfigService } from '../issuance-config.service';

@Component({
  selector: 'app-issuance-config-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './issuance-config-list.component.html',
  styleUrl: './issuance-config-list.component.scss',
})
export class IssuanceConfigListComponent implements OnInit {
  configs: IssuanceConfig[] = [];

  displayedColumns: (keyof IssuanceConfig | 'actions')[] = [
    'id',
    'authenticationConfig',
    'credentialIssuanceBindings',
    'actions',
  ];

  constructor(private issuanceConfigService: IssuanceConfigService) {}

  ngOnInit(): void {
    this.issuanceConfigService.loadConfigurations().then((configs) => (this.configs = configs));
  }
}
