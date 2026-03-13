import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { AttributeProviderEntity } from '@eudiplo/sdk-core';
import { AttributeProviderService } from '../attribute-provider.service';

@Component({
  selector: 'app-attribute-provider-list',
  imports: [MatTableModule, MatIconModule, MatButtonModule, RouterModule, FlexLayoutModule],
  templateUrl: './attribute-provider-list.component.html',
  styleUrl: './attribute-provider-list.component.scss',
})
export class AttributeProviderListComponent implements OnInit {
  providers: AttributeProviderEntity[] = [];

  displayedColumns: string[] = ['id', 'name', 'url', 'auth', 'actions'];

  constructor(private readonly attributeProviderService: AttributeProviderService) {}

  ngOnInit(): void {
    this.attributeProviderService.getAll().then((providers) => (this.providers = providers));
  }

  getAuthType(provider: AttributeProviderEntity): string {
    return provider.auth?.type === 'apiKey' ? 'API Key' : 'None';
  }
}
