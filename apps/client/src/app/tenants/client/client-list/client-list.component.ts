import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  clientControllerGetClients,
  ClientEntity,
  clientControllerDeleteClient,
} from '@eudiplo/sdk-core';
import { ApiService } from '../../../core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-client-list',
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    FlexLayoutModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent implements OnInit {
  @Input() loadedClients?: ClientEntity[];

  clients: ClientEntity[] = [];
  loading = false;
  hasPermission = false;

  displayedColumns: (keyof ClientEntity | 'actions')[] = [
    'clientId',
    'description',
    'roles',
    'actions',
  ];

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {}
  ngOnInit(): void {
    if (this.loadedClients) {
      this.clients = this.loadedClients;
    } else {
      this.loadClients();
    }
  }

  async loadClients(): Promise<void> {
    this.loading = true;
    try {
      this.clients = await clientControllerGetClients<true>().then((res) => res.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      this.snackBar.open('Failed to load clients', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async deleteClient(client: ClientEntity): Promise<void> {
    if (
      !client.clientId ||
      !confirm(`Are you sure you want to delete client "${client.clientId}"?`)
    ) {
      return;
    }

    try {
      await clientControllerDeleteClient({ path: { id: client.clientId } });
      await this.loadClients(); // Reload the list
      this.snackBar.open('Client deleted successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error deleting client:', error);
      this.snackBar.open('Failed to delete client', 'Close', { duration: 3000 });
    }
  }

  async copyLoginUrl(client: ClientEntity) {
    //TODO: the secret is only included when managed by eudiplo. Because for keycloak it's stored externally
    const apiUrl = this.apiService.getBaseUrl() as string;
    const loginUrl = await this.apiService.createConfigUrl(client, apiUrl);
    navigator.clipboard.writeText(loginUrl).then(() => {
      this.snackBar.open('Login URL copied to clipboard', 'Close', { duration: 3000 });
    });
  }

  async loginAsClient(client: ClientEntity): Promise<void> {
    try {
      const apiUrl = this.apiService.getBaseUrl() as string;

      // Fetch the client secret if not available
      let clientSecret = client.secret;
      if (!clientSecret) {
        const secretResponse = await import('@eudiplo/sdk-core').then((m) =>
          m.clientControllerGetClientSecret({ path: { id: client.clientId } })
        );
        clientSecret = secretResponse.data?.secret;
      }

      if (!clientSecret) {
        this.snackBar.open('Could not retrieve client secret', 'Close', { duration: 3000 });
        return;
      }

      // Logout current user
      this.apiService.logout();

      // Navigate to login with pre-filled credentials
      this.router.navigate(['/login'], {
        queryParams: {
          clientId: client.clientId,
          clientSecret: clientSecret,
          apiUrl: apiUrl,
        },
      });
    } catch (error) {
      console.error('Error logging in as client:', error);
      this.snackBar.open('Failed to login as client', 'Close', { duration: 3000 });
    }
  }
}
