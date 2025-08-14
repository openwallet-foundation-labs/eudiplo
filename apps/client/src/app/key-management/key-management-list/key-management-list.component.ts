import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CertEntity } from '../../generated';
import { KeyManagementService } from '../key-management.service';

@Component({
  selector: 'app-key-management-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './key-management-list.component.html',
  styleUrl: './key-management-list.component.scss',
})
export class KeyManagementListComponent implements OnInit {
  keys: CertEntity[] = [];

  displayedColumns: (keyof CertEntity | 'actions')[] = [
    'id',
    'description',
    'createdAt',
    'actions',
  ];

  constructor(private keyManagementService: KeyManagementService) {}
  ngOnInit(): void {
    this.keyManagementService.loadKeys().then(
      (keys) => (this.keys = keys),
      (error) => {
        console.error('Error loading keys:', error);
      }
    );
  }
}
