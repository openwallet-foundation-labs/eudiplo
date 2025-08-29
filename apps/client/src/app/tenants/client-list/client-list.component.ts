import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { KeycloakService, type ClientInfo } from '../keycloak.service';
import { ApiService } from '../../api.service';
import { tenantControllerDeleteTenant } from '../../generated';

@Component({
  selector: 'app-client-list',
  imports: [
    MatTableModule,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    FlexLayoutModule,
    MatSlideToggleModule,
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent implements OnInit {
  clients: ClientInfo[] = [];
  loading = false;
  hasPermission = false;

  displayedColumns: (keyof ClientInfo | 'actions')[] = [
    'clientId',
    'description',
    'enabled',
    'actions',
  ];

  constructor(
    private keycloakService: KeycloakService,
    private snackBar: MatSnackBar,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    if (this.hasPermission) {
      this.loadClients();
    }
  }

  private checkPermissions(): void {
    this.hasPermission = this.keycloakService.hasClientManagementPermission();
    if (!this.hasPermission) {
      this.snackBar.open(
        'You do not have permission to manage Keycloak clients. Required role: admin or client-admin',
        'Close',
        { duration: 5000 }
      );
    }
  }

  async loadClients(): Promise<void> {
    this.loading = true;
    try {
      this.clients = await this.keycloakService.listClients();
    } catch (error) {
      console.error('Error loading clients:', error);
      this.snackBar.open('Failed to load clients', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async toggleClientStatus(client: ClientInfo): Promise<void> {
    if (!client.id) return;

    try {
      await this.keycloakService.updateClientStatus(client.id, !client.enabled);
      client.enabled = !client.enabled;
      this.snackBar.open(`Client ${client.enabled ? 'enabled' : 'disabled'}`, 'Close', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      this.snackBar.open('Failed to update client status', 'Close', { duration: 3000 });
    }
  }

  async deleteClient(client: ClientInfo): Promise<void> {
    if (
      !client.clientId ||
      !confirm(`Are you sure you want to delete client "${client.clientId}"?`)
    ) {
      return;
    }

    try {
      await this.keycloakService.deleteClient(client.clientId);
      await tenantControllerDeleteTenant({ path: { id: client.clientId } });
      await this.loadClients(); // Reload the list
      this.snackBar.open('Client deleted successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error deleting client:', error);
      this.snackBar.open('Failed to delete client', 'Close', { duration: 3000 });
    }
  }

  async copyLoginUrl(client: ClientInfo) {
    const apiUrl = this.apiService.getBaseUrl() as string;
    const loginUrl = await this.keycloakService.createConfigUrl(client.id as string, apiUrl);
    navigator.clipboard.writeText(loginUrl).then(() => {
      this.snackBar.open('Login URL copied to clipboard', 'Close', { duration: 3000 });
    });
  }
}
