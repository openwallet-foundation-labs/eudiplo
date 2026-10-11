import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../core';

const checkIntervalMs = 30_000;
const warnBeforeMs = 5 * 60_000;

/**
 * Tells the user on every page when a token that cannot be refreshed is about
 * to expire, and when the session has expired for good.
 */
@Injectable({ providedIn: 'root' })
export class TokenExpiryService implements OnDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private checking = false;
  private warnedToken?: string;
  /** A token was seen since the last visit to the login page. */
  private hadToken = false;
  private expiredNotice?: MatSnackBarRef<TextOnlySnackBar>;

  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  start(): void {
    if (this.timer) return;
    void this.check();
    this.timer = setInterval(() => void this.check(), checkIntervalMs);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  async check(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      await this.update();
    } finally {
      this.checking = false;
    }
  }

  private async update(): Promise<void> {
    if (this.router.url.startsWith('/login')) {
      this.hadToken = false;
      this.dismissExpired();
      return;
    }
    const token = this.apiService.accessToken;
    if (!token) {
      // OIDC clears the token when its session ends; a logout goes to the login page instead.
      if (this.hadToken) this.showExpired();
      return;
    }
    this.hadToken = true;

    // A session that can refresh its token renews itself, for example after the
    // laptop slept; it has only expired when the refresh fails.
    const authenticated =
      this.apiService.getAuthenticationStatus() ||
      (this.apiService.canRefreshToken() && (await this.apiService.ensureAuthenticated()));
    if (!authenticated) {
      this.showExpired();
      return;
    }
    this.dismissExpired();

    const remaining = this.apiService.getTokenTimeRemaining();
    if (remaining < warnBeforeMs && !this.apiService.canRefreshToken()) {
      if (this.warnedToken === token) return;
      this.warnedToken = token;
      const minutes = Math.max(1, Math.floor(remaining / 60_000));
      this.snackBar.open(
        `Your session expires in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Save your work.`,
        'OK',
        { duration: 10_000, panelClass: ['warning-snackbar'] }
      );
    }
  }

  /** Opens the notice again when another message replaced it, as long as the session stays expired. */
  private showExpired(): void {
    if (this.expiredNotice) return;
    const notice = this.snackBar.open(
      'Your session has expired. Log in again; unsaved changes on this page will be lost.',
      'Log in',
      {
        duration: 0,
        panelClass: ['error-snackbar'],
      }
    );
    this.expiredNotice = notice;
    notice.afterDismissed().subscribe(() => {
      if (this.expiredNotice === notice) this.expiredNotice = undefined;
    });
    notice.onAction().subscribe(() => {
      this.apiService.logout();
      this.router.navigate(['/login']);
    });
  }

  private dismissExpired(): void {
    const notice = this.expiredNotice;
    this.expiredNotice = undefined;
    notice?.dismiss();
  }
}
