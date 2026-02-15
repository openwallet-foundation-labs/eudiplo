import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { PresentationConfig } from '@eudiplo/sdk-core';
import { PresentationManagementService } from '../presentation-management.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-presentation-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
    MatTooltipModule
  ],
  templateUrl: './presentation-list.component.html',
  styleUrl: './presentation-list.component.scss',
})
export class PresentationListComponent implements OnInit {
  configurations: PresentationConfig[] = [];
  loading = false;

  displayedColumns: (keyof PresentationConfig | 'actions')[] = [
    'id',
    'description',
    'createdAt',
    'actions',
  ];

  constructor(
    private presentationService: PresentationManagementService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadConfigurations();
  }

  async loadConfigurations(): Promise<void> {
    this.loading = true;
    try {
      this.configurations = await this.presentationService.loadConfigurations();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      this.snackBar.open('Failed to load configurations', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
