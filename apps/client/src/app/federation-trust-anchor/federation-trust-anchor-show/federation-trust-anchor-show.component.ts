import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { focusAfterRenderIfLost } from '../../common/focus-if-lost.util';
import { LoadErrorComponent } from '../../common/load-error.component';
import { ConfigDocumentService } from '../../config-portability/config-document.service';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../../config-portability/config-ownership-notice.component';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import {
  type FederationTrustAnchor,
  FederationTrustAnchorService,
} from '../federation-trust-anchor.service';
import { FederationTrustAnchorReferences } from '../federation-trust-anchor-references';

/** The members of a pinned key the page lists; the full key is in the JWK set below. */
interface PinnedKey {
  kid: string;
  kty: string;
  crv?: string;
  alg?: string;
  use?: string;
}

@Component({
  selector: 'app-federation-trust-anchor-show',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
    LoadErrorComponent,
  ],
  templateUrl: './federation-trust-anchor-show.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './federation-trust-anchor-show.component.scss',
  providers: [FederationTrustAnchorReferences],
})
export class FederationTrustAnchorShowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly service = inject(FederationTrustAnchorService);
  readonly references = inject(FederationTrustAnchorReferences);
  private readonly configDocuments = inject(ConfigDocumentService);
  private readonly injector = inject(Injector);

  @ViewChild('pageHeading', { read: ElementRef })
  private readonly pageHeading?: ElementRef<HTMLElement>;

  readonly keyColumns = ['kid', 'kty', 'crv', 'alg', 'use'];
  readonly id = this.route.snapshot.paramMap.get('id')!;
  anchor?: FederationTrustAnchor;
  keys: PinnedKey[] = [];
  jwksJson = '';
  /** Set when the trust anchor could not be loaded, so the page is not left blank. */
  loadError = '';
  /** True while a delete request runs, so it is not sent twice. */
  deleting = false;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const retrying = this.loadError !== '';
    this.loadError = '';
    try {
      const anchor = await this.service.getById(this.id);
      this.anchor = anchor;
      const keys = (anchor.jwks as { keys?: PinnedKey[] }).keys;
      this.keys = Array.isArray(keys) ? keys : [];
      this.jwksJson = JSON.stringify(anchor.jwks, null, 2);
      // The retry removed the error card with its focused Retry button.
      if (retrying) focusAfterRenderIfLost(this.injector, () => this.pageHeading?.nativeElement);
      await this.references.load(anchor.entityId);
    } catch (error) {
      if (!this.anchor) this.loadError = getApiErrorMessage(error, 'Failed to load trust anchor');
    }
  }

  /**
   * Asks before deleting. The backend deletes a trust anchor that configurations still name;
   * they then stop trusting its federation, so the question names the references it knows of.
   */
  deleteQuestion(): string {
    const name = this.anchor?.description
      ? `"${this.anchor.description}" (${this.id})`
      : `"${this.id}"`;
    const uses = this.references.describe();
    const consequence = uses
      ? ` It is named by ${uses}, which then no longer trust this federation.`
      : ' Configurations that name its entity ID no longer trust this federation.';
    return `Delete trust anchor ${name}?${consequence} This cannot be undone.`;
  }

  async delete(): Promise<void> {
    // The question names the references, so it waits until they are known.
    if (this.deleting || this.references.loading || !confirm(this.deleteQuestion())) return;
    this.deleting = true;
    try {
      await this.service.delete(this.id);
      this.snackBar.open('Trust anchor deleted', 'Close', { duration: 3000 });
      await this.router.navigate(['/federation-trust-anchor']);
    } catch (error) {
      this.deleting = false;
      openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Error deleting trust anchor'));
    }
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(
      () => this.snackBar.open(`${label} copied to clipboard`, 'Close', { duration: 2000 }),
      () => this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2000 })
    );
  }

  /** True while the configuration document is being downloaded. */
  get downloadingConfig(): boolean {
    return this.configDocuments.isDownloading('FederationTrustAnchor', this.id);
  }

  async download(): Promise<void> {
    await this.configDocuments.downloadWithFeedback('FederationTrustAnchor', this.id);
  }
}
