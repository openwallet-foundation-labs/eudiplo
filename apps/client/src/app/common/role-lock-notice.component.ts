import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Explains why a client or user cannot be changed: it has roles the signed-in
 * caller neither holds nor may grant.
 */
@Component({
  selector: 'app-role-lock-notice',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    @if (roles.length > 0) {
      <mat-card appearance="outlined" class="role-notice" role="status">
        <mat-card-content>
          <mat-icon>lock</mat-icon>
          <span>
            This {{ subject }} has {{ roles.join(', ') }}, which you neither hold nor may grant.
            {{ consequence }}
          </span>
        </mat-card-content>
      </mat-card>
    }
  `,
  styleUrl: './role-lock-notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleLockNoticeComponent {
  @Input({ required: true }) subject!: 'client' | 'user';
  @Input({ required: true }) roles: string[] = [];

  get consequence(): string {
    return this.subject === 'client'
      ? 'You cannot change it, delete it or rotate its secret.'
      : 'You cannot change or delete them.';
  }
}
