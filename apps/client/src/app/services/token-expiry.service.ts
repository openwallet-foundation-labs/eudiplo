import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router } from '@angular/router';
import { filter, merge, Subscription } from 'rxjs';
import { ApiService } from '../core';

const checkIntervalMs = 30_000;
const warnBeforeMs = 5 * 60_000;

type NoticeKind = 'expired' | 'unreachable';

/**
 * Tells the user on every page when a token that cannot be refreshed is about
 * to expire, when the session has expired for good, and when it cannot be
 * renewed because the backend is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class TokenExpiryService implements OnDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private events?: Subscription;
  private checking = false;
  private warnedToken?: string;
  /** A token was seen since the last visit to the login page. */
  private hadToken = false;
  private notice?: { kind: NoticeKind; ref: MatSnackBarRef<TextOnlySnackBar> };

  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  start(): void {
    if (this.timer) return;
    void this.check();
    this.timer = setInterval(() => void this.check(), checkIntervalMs);
    // Update the notice at once when the session resumes or the user moves to another page.
    this.events = merge(
      this.apiService.tokenRenewed$,
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
    ).subscribe(() => void this.check());
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.events?.unsubscribe();
    this.events = undefined;
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
      this.dismissNotice();
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
    if (this.router.url.startsWith('/login')) {
      // The user moved to the login page while the session was being renewed.
      this.dismissNotice();
      return;
    }
    if (!authenticated) {
      if (this.apiService.isReconnecting()) {
        this.showUnreachable();
      } else {
        this.showExpired();
      }
      return;
    }
    this.dismissNotice();

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
    const notice = this.showNotice(
      'expired',
      'Your session has expired. Log in again; unsaved changes on this page will be lost.',
      'Log in'
    );
    notice?.onAction().subscribe(() => {
      this.apiService.logout();
      this.router.navigate(['/login']);
    });
  }

  /**
   * The session is kept and resumes by itself once the backend answers again,
   * so this notice offers no logout that would throw it away.
   */
  private showUnreachable(): void {
    this.showNotice(
      'unreachable',
      'The backend cannot be reached. Your session resumes once it is back; stay on this page to keep unsaved changes.'
    );
  }

  /** Opens a notice of this kind unless one is open, replacing a notice of the other kind. */
  private showNotice(
    kind: NoticeKind,
    message: string,
    action?: string
  ): MatSnackBarRef<TextOnlySnackBar> | undefined {
    if (this.notice?.kind === kind) return undefined;
    const ref = this.snackBar.open(message, action, {
      duration: 0,
      panelClass: ['error-snackbar'],
    });
    const notice = { kind, ref };
    this.notice = notice;
    ref.afterDismissed().subscribe(() => {
      if (this.notice === notice) this.notice = undefined;
    });
    return ref;
  }

  private dismissNotice(): void {
    const notice = this.notice;
    this.notice = undefined;
    notice?.ref.dismiss();
  }
}
