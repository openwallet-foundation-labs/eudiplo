import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { tenantControllerGetTenant, TenantEntity } from '@eudiplo/sdk';

import { ClientListComponent } from '../client/client-list/client-list.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-tenant-show',
  imports: [
    ClientListComponent,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    FlexLayoutModule,
    MatListModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './tenant-show.component.html',
  styleUrl: './tenant-show.component.scss',
})
export class TenantShowComponent implements OnInit {
  tenant?: TenantEntity;

  constructor(private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenant = await tenantControllerGetTenant<true>({ path: { id } }).then((res) => res.data);
    }
  }

  getCleanupModeLabel(mode?: string): string {
    switch (mode) {
      case 'anonymize':
        return 'Anonymize (keep metadata, remove PII)';
      case 'full':
      default:
        return 'Full Delete';
    }
  }

  formatTtl(seconds?: number): string {
    if (!seconds) return 'Global default (24 hours)';
    if (seconds < 3600) return `${seconds} seconds`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    return `${Math.round(seconds / 86400)} days`;
  }
}
