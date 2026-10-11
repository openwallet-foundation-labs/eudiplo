import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TrustList } from '@eudiplo/sdk-core';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import { BaseAsyncListComponent } from '../../common/base-async-list.component';
import { LoadErrorComponent } from '../../common/load-error.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TrustListService } from '../trust-list.service';

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
export class TrustListListComponent extends BaseAsyncListComponent<TrustList> {
  protected readonly loadFailedMessage = 'Failed to load trust lists';

  get lists(): TrustList[] {
    return this.items;
  }

  displayedColumns: (keyof TrustList | 'actions')[] = ['id', 'description', 'actions'];

  constructor(
    private readonly trustListService: TrustListService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
  }

  protected fetchItems(): Promise<TrustList[]> {
    return this.trustListService.getAll();
  }

  async downloadConfig(list: TrustList): Promise<void> {
    try {
      await this.trustListService.downloadConfig(list.id);
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
