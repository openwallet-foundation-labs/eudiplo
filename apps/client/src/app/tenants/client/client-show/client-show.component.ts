import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { clientControllerGetClient, ClientEntity } from '@eudiplo/sdk-core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatChipsModule } from '@angular/material/chips';
import { ConfigOwnershipDirective } from '../../../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../../../config-portability/config-ownership-notice.component';
import { JwtService } from '../../../services/jwt.service';
import { roleChoices } from '../../../services/role-grants';
import { RoleLockNoticeComponent } from '../../../common/role-lock-notice.component';
import { getApiErrorMessage } from '../../../utils/error-message';

@Component({
  selector: 'app-client-show',
  imports: [
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    FlexLayoutModule,
    MatChipsModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
    RoleLockNoticeComponent,
  ],
  templateUrl: './client-show.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './client-show.component.scss',
})
export class ClientShowComponent implements OnInit {
  client?: ClientEntity;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly jwtService: JwtService
  ) {}

  /** Roles of the client that keep the signed-in caller from editing or deleting it */
  get unmanageableRoles(): string[] {
    return roleChoices(this.jwtService.getRoles(), this.client?.roles ?? []).unmanageable;
  }

  /** Whether the signed-in caller may edit or delete the client. */
  get canManage(): boolean {
    return this.unmanageableRoles.length === 0;
  }

  ngOnInit() {
    const clientId = this.route.snapshot.paramMap.get('id')!;
    clientControllerGetClient({ path: { id: clientId } }).then(
      (client) => (this.client = client.data),
      (err) => {
        this.snackBar.open(getApiErrorMessage(err, 'Failed to load client'), 'Close', {
          duration: 5000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    );
  }
}
