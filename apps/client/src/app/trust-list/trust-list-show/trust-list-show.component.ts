import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  ApiService,
  TrustList,
  TrustListVersion,
  trustListControllerDeleteTrustList,
  trustListControllerGetTrustList,
  trustListControllerGetTrustListVersions,
} from '@eudiplo/sdk';
import { FlexLayoutModule } from 'ngx-flexible-layout';

interface EntityInfo {
  name: string;
  lang?: string;
  uri?: string;
  country?: string;
  locality?: string;
  postalCode?: string;
  streetAddress?: string;
  contactUri?: string;
}

interface InternalEntity {
  type: 'internal';
  issuerCertId: string;
  revocationCertId: string;
  info: EntityInfo;
}

interface ExternalEntity {
  type: 'external';
  issuerCertPem: string;
  revocationCertPem: string;
  info: EntityInfo;
}

type TrustListEntity = InternalEntity | ExternalEntity;

@Component({
  selector: 'app-trust-list-show',
  imports: [
    CommonModule,
    DatePipe,
    MatSnackBarModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './trust-list-show.component.html',
  styleUrl: './trust-list-show.component.scss',
})
export class TrustListShowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiService = inject(ApiService);

  trustList?: TrustList;
  entities: TrustListEntity[] = [];
  versions: TrustListVersion[] = [];
  publicUrl = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    trustListControllerGetTrustList({ path: { id } }).then(
      (res) => {
        this.trustList = res.data;
        this.parseEntities();
        this.loadVersions(id);
        this.buildPublicUrl();
      },
      () => {
        this.snackBar.open('Error loading trust list', 'Close', { duration: 3000 });
        this.router.navigate(['/trust-list']);
      }
    );
  }

  private parseEntities(): void {
    if (this.trustList?.entityConfig) {
      this.entities = this.trustList.entityConfig as unknown as TrustListEntity[];
    }
  }

  private loadVersions(id: string): void {
    trustListControllerGetTrustListVersions({ path: { id } }).then(
      (res) => {
        this.versions = res.data ?? [];
      },
      () => {
        // Version history not critical, just log
        console.warn('Could not load version history');
      }
    );
  }

  isInternalEntity(entity: TrustListEntity): entity is InternalEntity {
    return entity.type === 'internal';
  }

  isExternalEntity(entity: TrustListEntity): entity is ExternalEntity {
    return entity.type === 'external';
  }

  getTrustedEntitiesCount(): number {
    const data = this.trustList?.data as { TrustedEntitiesList?: unknown[] } | undefined;
    return data?.TrustedEntitiesList?.length ?? 0;
  }

  private buildPublicUrl(): void {
    if (this.trustList) {
      const baseUrl = this.apiService.getBaseUrl() || '';
      const tenantId = this.trustList.tenant?.id || '';
      this.publicUrl = `${baseUrl}${tenantId}/trust-list/${this.trustList.id}`;
    }
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.snackBar.open(`${label} copied to clipboard`, 'Close', { duration: 2000 });
      },
      () => {
        this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2000 });
      }
    );
  }

  delete() {
    if (!confirm('Are you sure you want to delete this trust list?')) {
      return;
    }
    const id = this.route.snapshot.paramMap.get('id')!;
    trustListControllerDeleteTrustList({ path: { id } }).then(
      () => {
        this.snackBar.open('Trust list deleted', 'Close', { duration: 3000 });
        this.router.navigate(['/trust-list']);
      },
      () => {
        this.snackBar.open('Error deleting trust list', 'Close', { duration: 3000 });
      }
    );
  }

  /**
   * Downloads the current configuration as a JSON file.
   */
  download() {
    if (this.trustList) {
      const blob = new Blob([JSON.stringify(this.trustList, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trust-list-${this.trustList.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', {
      duration: 3000,
    });
  }
}
