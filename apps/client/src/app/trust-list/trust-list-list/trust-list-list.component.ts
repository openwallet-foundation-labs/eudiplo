import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { TrustList, trustListControllerGetAllTrustLists } from '@eudiplo/sdk';
import { FlexLayoutModule } from 'ngx-flexible-layout';

@Component({
  selector: 'app-trust-list-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './trust-list-list.component.html',
  styleUrl: './trust-list-list.component.scss',
})
export class TrustListListComponent implements OnInit {
  lists: TrustList[] = [];

  displayedColumns: (keyof TrustList | 'actions')[] = ['id', 'description', 'actions'];

  ngOnInit(): void {
    trustListControllerGetAllTrustLists().then((lists) => {
      this.lists = lists.data;
    });
  }
}
