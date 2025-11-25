import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { tenantControllerGetTenant, TenantEntity } from '../../generated';

import { ClientListComponent } from '../client/client-list/client-list.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-tenant-show',
  imports: [
    ClientListComponent,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    FlexLayoutModule,
    MatListModule
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
}
