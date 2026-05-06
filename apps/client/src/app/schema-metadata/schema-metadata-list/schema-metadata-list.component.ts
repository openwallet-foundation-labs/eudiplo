import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { SchemaMetadata, SchemaMetadataService } from '../schema-metadata.service';

@Component({
  selector: 'app-schema-metadata-list',
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './schema-metadata-list.component.html',
  styleUrl: './schema-metadata-list.component.scss',
})
export class SchemaMetadataListComponent implements OnInit {
  items: SchemaMetadata[] = [];
  loading = false;

  displayedColumns: (keyof SchemaMetadata | 'actions')[] = [
    'id',
    'version',
    'issuer',
    'updatedAt',
    'actions',
  ];

  constructor(
    private readonly schemaMetadataService: SchemaMetadataService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading = true;
    try {
      this.items = await this.schemaMetadataService.list();
    } catch (error) {
      console.error('Failed to load schema metadata:', error);
      this.snackBar.open('Failed to load schema metadata', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
