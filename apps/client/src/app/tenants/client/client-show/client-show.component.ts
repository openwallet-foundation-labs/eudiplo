import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { clientControllerGetClient, ClientEntity } from '../../../generated';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-client-show',
  imports: [
    MatSnackBarModule,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    FlexLayoutModule,
    MatChipsModule,
  ],
  templateUrl: './client-show.component.html',
  styleUrl: './client-show.component.scss',
})
export class ClientShowComponent implements OnInit {
  client?: ClientEntity;
  constructor(
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const clientId = this.route.snapshot.paramMap.get('id')!;
    await clientControllerGetClient({ path: { id: clientId } }).then(
      (client) => (this.client = client.data),
      (err) => {
        this.snackBar.open(
          'Failed to load client: ' + (err instanceof Error ? err.message : ''),
          'Close',
          { duration: 5000 }
        );
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    );
  }
}
