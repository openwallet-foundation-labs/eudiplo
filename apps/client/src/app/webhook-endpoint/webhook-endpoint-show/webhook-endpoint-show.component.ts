import { Component, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { WebhookEndpointEntity } from '@eudiplo/sdk-core';
import { WebhookEndpointService } from '../webhook-endpoint.service';

@Component({
  selector: 'app-webhook-endpoint-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatListModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './webhook-endpoint-show.component.html',
  styleUrl: './webhook-endpoint-show.component.scss',
})
export class WebhookEndpointShowComponent implements OnInit {
  endpoint: WebhookEndpointEntity | undefined;

  constructor(
    private readonly webhookEndpointService: WebhookEndpointService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.webhookEndpointService.getById(id).then(
        (endpoint) => (this.endpoint = endpoint),
        (error) => {
          this.snackBar.open('Failed to load webhook endpoint', 'Close', { duration: 3000 });
          console.error('Load error:', error);
        }
      );
    }
  }

  getAuthType(): string {
    return this.endpoint?.auth?.type === 'apiKey' ? 'API Key' : 'None';
  }

  getAuthHeaderName(): string | null {
    if (this.endpoint?.auth?.type === 'apiKey') {
      return (this.endpoint.auth as any).config?.headerName || null;
    }
    return null;
  }

  deleteEndpoint(): void {
    if (this.endpoint && confirm('Are you sure you want to delete this webhook endpoint?')) {
      this.webhookEndpointService
        .delete(this.endpoint.id)
        .then(() => {
          this.snackBar.open('Webhook endpoint deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          this.snackBar.open('Failed to delete webhook endpoint', 'Close', { duration: 3000 });
          console.error('Delete error:', error);
        });
    }
  }

  downloadConfig(): void {
    if (this.endpoint) {
      const config = { ...(this.endpoint as any) };
      delete config.tenantId;
      delete config.tenant;
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhook-endpoint-${this.endpoint.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', { duration: 3000 });
  }
}
