import { Component, type OnInit, ChangeDetectionStrategy } from '@angular/core';
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
import { getApiKeyAuthType, getApiKeyHeaderName } from '../../common/auth-display.util';
import { ConfigDocumentService } from '../../config-portability/config-document.service';
import { WebhookEndpointService } from '../webhook-endpoint.service';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../../config-portability/config-ownership-notice.component';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import { LoadErrorComponent } from '../../common/load-error.component';

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
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
    LoadErrorComponent,
  ],
  templateUrl: './webhook-endpoint-show.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './webhook-endpoint-show.component.scss',
})
export class WebhookEndpointShowComponent implements OnInit {
  endpoint: WebhookEndpointEntity | undefined;
  /** Set when the page's data could not be loaded, so the page is not left blank. */
  loadError = '';

  constructor(
    private readonly webhookEndpointService: WebhookEndpointService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly configDocuments: ConfigDocumentService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadError = '';
      this.webhookEndpointService.getById(id).then(
        (endpoint) => (this.endpoint = endpoint),
        (error) => {
          console.error('Load error:', error);
          this.loadError = getApiErrorMessage(error, 'Failed to load webhook endpoint');
        }
      );
    }
  }

  getAuthType(): string {
    return getApiKeyAuthType(this.endpoint?.auth as { type?: string } | undefined);
  }

  getAuthHeaderName(): string | null {
    return getApiKeyHeaderName(
      this.endpoint?.auth as { type?: string; config?: { headerName?: string } } | undefined
    );
  }

  deleteEndpoint(): void {
    if (
      this.endpoint &&
      confirm(
        `Delete webhook endpoint "${this.endpoint.name || this.endpoint.id}"? This cannot be undone.`
      )
    ) {
      this.webhookEndpointService
        .delete(this.endpoint.id)
        .then(() => {
          this.snackBar.open('Webhook endpoint deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          openErrorSnackBar(
            this.snackBar,
            getApiErrorMessage(error, 'Failed to delete webhook endpoint')
          );
          console.error('Delete error:', error);
        });
    }
  }

  get canDownloadConfig(): boolean {
    return this.configDocuments.canDownload('WebhookEndpoint');
  }

  /** True while the configuration document is being downloaded. */
  get downloadingConfig(): boolean {
    return (
      !!this.endpoint && this.configDocuments.isDownloading('WebhookEndpoint', this.endpoint.id)
    );
  }

  /**
   * Downloads the configuration as a document that the config folder and
   * configuration bundles import.
   */
  async downloadConfig(): Promise<void> {
    if (!this.endpoint) return;
    await this.configDocuments.downloadWithFeedback('WebhookEndpoint', this.endpoint.id);
  }
}
