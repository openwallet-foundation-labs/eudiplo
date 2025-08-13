import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, type OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { Session } from '../../generated';
import { SessionManagementService } from '../session-management.service';

// Define the SessionStatus type
export type SessionStatus = 'active' | 'completed' | 'expired' | 'failed';

@Component({
  selector: 'app-session-management-list',
  imports: [
    MatTableModule,
    MatSortModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatTooltipModule,
    MatCheckboxModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
    ReactiveFormsModule,
  ],
  templateUrl: './session-management-list.component.html',
  styleUrl: './session-management-list.component.scss',
})
export class SessionManagementListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Session>([]);
  typeFilter = new FormControl('all');
  statusFilter = new FormControl('all');
  selection = new SelectionModel<Session>(true, []);

  displayedColumns: (keyof Session | 'select' | 'type' | 'actions')[] = [
    'select',
    'id',
    'type',
    'status',
    'createdAt',
    'actions',
  ];

  typeOptions = [
    { value: 'all', label: 'All Sessions' },
    { value: 'issuance', label: 'Issuance Sessions' },
    { value: 'presentation', label: 'Presentation Sessions' },
  ];

  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' },
    { value: 'failed', label: 'Failed' },
  ];

  private allSessions: Session[] = [];
  deletingSelected = false;

  constructor(private sessionManagementService: SessionManagementService) {
    // Set up filter listeners
    this.typeFilter.valueChanges.subscribe(() => {
      this.applyFilter();
    });

    this.statusFilter.valueChanges.subscribe(() => {
      this.applyFilter();
    });
  }

  ngOnInit(): void {
    this.refreshSessions().then(
      () => {
        // Custom sort for createdAt
        this.dataSource.sortingDataAccessor = (item: Session, property: string) => {
          switch (property) {
            case 'createdAt':
              return new Date(item.createdAt).getTime();
            case 'type':
              return item.issuanceId ? 'issuance' : 'presentation';
            case 'status':
              return this.getSessionStatus(item);
            default:
              return (item as any)[property];
          }
        };
      },
      (error) => {
        console.error('Error loading sessions:', error);
      }
    );
  }

  refreshSessions() {
    return this.sessionManagementService.getAllSessions().then((sessions) => {
      this.dataSource.data = sessions;
      this.allSessions = sessions;
      this.selection.clear(); // Clear selection when data is refreshed
      this.applyFilter(); // Reapply filter after refresh
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  applyFilter(): void {
    const typeFilterValue = this.typeFilter.value;
    const statusFilterValue = this.statusFilter.value;

    let filteredSessions = this.allSessions;

    // Apply type filter
    if (typeFilterValue === 'issuance') {
      filteredSessions = filteredSessions.filter((session) => !!session.issuanceId);
    } else if (typeFilterValue === 'presentation') {
      filteredSessions = filteredSessions.filter((session) => !session.issuanceId);
    }

    // Apply status filter
    if (statusFilterValue !== 'all') {
      filteredSessions = filteredSessions.filter((session) => {
        const sessionStatus = this.getSessionStatus(session);
        return sessionStatus === statusFilterValue;
      });
    }

    this.dataSource.data = filteredSessions;
  }

  getSessionStatus(session: Session): SessionStatus {
    // Extract status from the session.status object or return a default
    if (typeof session.status === 'object' && session.status !== null) {
      // If status is an object, try to find a status field or return 'active' as default
      const statusObj = session.status as any;
      if (
        statusObj.status &&
        ['active', 'completed', 'expired', 'failed'].includes(statusObj.status)
      ) {
        return statusObj.status as SessionStatus;
      }
      // Check for other common status field names
      if (
        statusObj.state &&
        ['active', 'completed', 'expired', 'failed'].includes(statusObj.state)
      ) {
        return statusObj.state as SessionStatus;
      }
    } else if (
      typeof session.status === 'string' &&
      ['active', 'completed', 'expired', 'failed'].includes(session.status)
    ) {
      return session.status as SessionStatus;
    }

    // Default to 'active' if no valid status is found
    return 'active';
  }

  getStatusDisplay(status: any): string {
    return this.sessionManagementService.getStatusDisplay(status);
  }

  getStatusClass(status: any): string {
    const sessionStatus = this.getSessionStatus({ status } as Session);
    return 'status-' + sessionStatus;
  }

  getSessionType(session: Session): string {
    return session.issuanceId ? 'issuance' : 'presentation';
  }

  // Selection methods
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  checkboxLabel(row?: Session): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  async deleteSelectedSessions() {
    if (this.selection.selected.length === 0) {
      return;
    }

    const selectedSessions = [...this.selection.selected]; // Create a copy
    const selectedCount = selectedSessions.length;

    this.deletingSelected = true;
    try {
      // Delete each selected session
      const deletePromises = selectedSessions.map((session) =>
        this.sessionManagementService.deleteSession(session.id)
      );

      await Promise.all(deletePromises);

      // Clear selection and refresh the list
      this.selection.clear();
      await this.refreshSessions();

      // You can add a snackbar notification here if you have it set up
      console.log(`Successfully deleted ${selectedCount} sessions`);
    } catch (error) {
      console.error('Error deleting sessions:', error);
      // You can add error notification here
    } finally {
      this.deletingSelected = false;
    }
  }

  clearSelection() {
    this.selection.clear();
  }
}
