import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import {
  TrustList,
  trustListControllerExportTrustList,
  trustListControllerGetAllTrustLists,
} from '@eudiplo/sdk-core';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import { LoadErrorComponent } from '../../common/load-error.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-trust-list-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    RouterModule,
    FlexLayoutModule,
    ConfigOwnershipDirective,
    LoadErrorComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './trust-list-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './trust-list-list.component.scss',
})
export class TrustListListComponent implements OnInit {
  lists: TrustList[] = [];
  loading = true;
  /** Set when the list could not be loaded, so it is not shown as empty. */
  loadError = '';

  displayedColumns: (keyof TrustList | 'actions')[] = ['id', 'description', 'actions'];

  constructor(private readonly snackBar: MatSnackBar) {}

  ngOnInit(): void {
    void this.loadLists();
  }

  async loadLists(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.lists = (await trustListControllerGetAllTrustLists()).data;
    } catch (error) {
      console.error('Error loading trust lists:', error);
      this.loadError = getApiErrorMessage(error, 'Failed to load trust lists');
    } finally {
      this.loading = false;
    }
  }

  async downloadConfig(list: TrustList): Promise<void> {
    try {
      const config = await trustListControllerExportTrustList({
        path: { id: list.id! },
      }).then((res) => res.data);

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `trustlist-${list.id}-config.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      this.snackBar.open('Trust list configuration downloaded', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error downloading config:', error);
      openErrorSnackBar(
        this.snackBar,
        getApiErrorMessage(error, 'Failed to download configuration')
      );
    }
  }
}
