import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { JwtService } from '../../services/jwt.service';
import { getApiErrorMessage } from '../../utils/error-message';
import { SchemaMetadata, SchemaService } from '../schema.service';
import { compareVersionsDesc } from '../schema-version';

interface GroupedSchemaMetadata {
  id: string;
  issuer: string;
  updatedAt: string;
  versions: string[];
}

@Component({
  selector: 'app-schema-list',
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './schema-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './schema-list.component.scss',
})
export class SchemaListComponent implements OnInit {
  items: SchemaMetadata[] = [];
  groupedItems: GroupedSchemaMetadata[] = [];
  loading = false;
  /** Why the list could not be loaded; shown instead of the empty state. */
  loadError = '';

  get schemaMetadataCount(): number {
    return this.groupedItems.length;
  }

  get schemaMetadataVersionCount(): number {
    return this.items.length;
  }

  displayedColumns: (keyof GroupedSchemaMetadata | 'actions')[] = [
    'id',
    'versions',
    'issuer',
    'updatedAt',
    'actions',
  ];

  constructor(
    private readonly schemaService: SchemaService,
    private readonly jwtService: JwtService
  ) {}

  /** Creating a schema publishes it, which needs `issuance:manage` besides `registrar:manage`. */
  get canCreate(): boolean {
    return this.jwtService.hasRole('issuance:manage');
  }

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.items = await this.schemaService.listMine();
      this.groupedItems = this.groupById(this.items);
    } catch (error) {
      console.error('Failed to load schema metadata:', error);
      this.items = [];
      this.groupedItems = [];
      this.loadError = getApiErrorMessage(error, 'Failed to load schemas');
    } finally {
      this.loading = false;
    }
  }

  private groupById(items: SchemaMetadata[]): GroupedSchemaMetadata[] {
    const groups = new Map<string, GroupedSchemaMetadata>();

    for (const item of items) {
      const existing = groups.get(item.id);
      if (!existing) {
        groups.set(item.id, {
          id: item.id,
          issuer: item.issuer,
          updatedAt: item.updatedAt,
          versions: [item.version],
        });
        continue;
      }

      existing.versions.push(item.version);
      if (new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        existing.updatedAt = item.updatedAt;
        existing.issuer = item.issuer;
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        versions: Array.from(new Set(group.versions)).sort(compareVersionsDesc),
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
