import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { WebhookEndpointEntity } from '@eudiplo/sdk-core';
import { getApiKeyAuthType } from '../../common/auth-display.util';
import { BaseAsyncListComponent } from '../../common/base-async-list.component';
import { WebhookEndpointService } from '../webhook-endpoint.service';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { LoadErrorComponent } from '../../common/load-error.component';

@Component({
  selector: 'app-webhook-endpoint-list',
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
    ConfigOwnershipDirective,
    LoadErrorComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './webhook-endpoint-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './webhook-endpoint-list.component.scss',
})
export class WebhookEndpointListComponent extends BaseAsyncListComponent<WebhookEndpointEntity> {
  protected readonly loadFailedMessage = 'Failed to load webhook endpoints';

  get endpoints(): WebhookEndpointEntity[] {
    return this.items;
  }

  displayedColumns: string[] = ['id', 'name', 'url', 'auth', 'actions'];

  constructor(private readonly webhookEndpointService: WebhookEndpointService) {
    super();
  }

  protected fetchItems(): Promise<WebhookEndpointEntity[]> {
    return this.webhookEndpointService.getAll();
  }

  getAuthType(endpoint: WebhookEndpointEntity): string {
    return getApiKeyAuthType(endpoint.auth as { type?: string });
  }
}
