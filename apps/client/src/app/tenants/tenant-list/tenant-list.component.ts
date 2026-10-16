import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  tenantControllerDeleteTenant,
  tenantControllerGetTenants,
  TenantResponseDto,
} from '@eudiplo/sdk-core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoadErrorComponent } from '../../common/load-error.component';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-tenant-list',
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    FlexLayoutModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    LoadErrorComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './tenant-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tenant-list.component.scss',
})
export class TenantListComponent implements OnInit {
  displayedColumns: (keyof TenantResponseDto | 'actions')[] = [
    'id',
    'name',
    'description',
    'status',
    'actions',
  ];
  tenants: TenantResponseDto[] = [];
  loading = true;
  /** Set when the list could not be loaded, so it is not shown as empty. */
  loadError = '';

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    void this.loadTenants();
  }

  async loadTenants(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.tenants = await tenantControllerGetTenants<true>().then((res) => res.data);
    } catch (error) {
      console.error('Error loading tenants:', error);
      this.loadError = getApiErrorMessage(error, 'Failed to load tenants');
    } finally {
      this.loading = false;
    }
  }

  deleteTenant(tenant: TenantResponseDto): void {
    if (!confirm(`Delete tenant "${tenant.name}" and all its data? This cannot be undone.`)) {
      return;
    }
    tenantControllerDeleteTenant({ path: { id: tenant.id } }).then(
      () => {
        this.tenants = this.tenants.filter((t) => t.id !== tenant.id);
        this.snackBar.open('Tenant deleted successfully', 'Close', { duration: 3000 });
      },
      (error) => {
        console.error('Error deleting tenant:', error);
        openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Failed to delete tenant'));
      }
    );
  }
}
