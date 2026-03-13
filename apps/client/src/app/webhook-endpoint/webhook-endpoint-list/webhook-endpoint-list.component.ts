import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { WebhookEndpointEntity } from '@eudiplo/sdk-core';
import { WebhookEndpointService } from '../webhook-endpoint.service';

@Component({
  selector: 'app-webhook-endpoint-list',
  imports: [MatTableModule, MatIconModule, MatButtonModule, RouterModule, FlexLayoutModule],
  templateUrl: './webhook-endpoint-list.component.html',
  styleUrl: './webhook-endpoint-list.component.scss',
})
export class WebhookEndpointListComponent implements OnInit {
  endpoints: WebhookEndpointEntity[] = [];

  displayedColumns: string[] = ['id', 'name', 'url', 'auth', 'actions'];

  constructor(private readonly webhookEndpointService: WebhookEndpointService) {}

  ngOnInit(): void {
    this.webhookEndpointService.getAll().then((endpoints) => (this.endpoints = endpoints));
  }

  getAuthType(endpoint: WebhookEndpointEntity): string {
    return endpoint.auth?.type === 'apiKey' ? 'API Key' : 'None';
  }
}
