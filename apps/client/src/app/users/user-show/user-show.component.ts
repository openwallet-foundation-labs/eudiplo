import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ManagedUserDto, userControllerDeleteUser, userControllerGetUser } from '@eudiplo/sdk-core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JwtService } from '../../services/jwt.service';
import { roleChoices } from '../../services/role-grants';
import { RoleLockNoticeComponent } from '../../common/role-lock-notice.component';
import { getApiErrorMessage } from '../../utils/error-message';

@Component({
  selector: 'app-user-show',
  imports: [
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    FlexLayoutModule,
    MatChipsModule,
    MatTooltipModule,
    RoleLockNoticeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './user-show.component.html',
})
export class UserShowComponent implements OnInit {
  user?: ManagedUserDto;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly jwtService: JwtService
  ) {}

  /** Roles of the user that keep the signed-in caller from editing or deleting it */
  get unmanageableRoles(): string[] {
    return roleChoices(this.jwtService.getRoles(), this.user?.roles ?? []).unmanageable;
  }

  /** Whether the signed-in caller may edit or delete the user. */
  get canManage(): boolean {
    return this.unmanageableRoles.length === 0;
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id')!;
    userControllerGetUser({ path: { id: userId } }).then(
      (user) => (this.user = user.data),
      (err) => {
        this.snackBar.open(getApiErrorMessage(err, 'Failed to load user'), 'Close', {
          duration: 5000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    );
  }

  async deleteUser(): Promise<void> {
    if (
      !this.user?.id ||
      !confirm(`Are you sure you want to delete user "${this.user.username}"?`)
    ) {
      return;
    }

    try {
      await userControllerDeleteUser({ path: { id: this.user.id } });
      this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
      await this.router.navigate(['../'], { relativeTo: this.route });
    } catch (error) {
      console.error('Error deleting user:', error);
      this.snackBar.open(getApiErrorMessage(error, 'Failed to delete user'), 'Close', {
        duration: 5000,
      });
    }
  }
}
