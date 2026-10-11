import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  Component,
  ElementRef,
  type OnDestroy,
  type OnInit,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { JwtService, Role } from './services/jwt.service';
import { ThemeService } from './services/theme.service';
import { VersionService } from './services/version.service';
import { TokenExpiryService } from './services/token-expiry.service';
import { NavSectionsService } from './services/nav-sections.service';
import { NavSectionComponent } from './common/nav-section/nav-section.component';
import { ApiService } from './core';
import { KEY_CHAIN_ROLES } from './key-management/key-chain.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    FlexLayoutModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule,
    MatDividerModule,
    RouterModule,
    NavSectionComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  logout() {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }
  shouldShowToolbar = true;
  sidenavOpened = false;
  sidenavMode: 'over' | 'side' = 'side';
  @ViewChild('mainContent', { read: ElementRef }) private mainContent?: ElementRef<HTMLElement>;
  private routerSubscription?: Subscription;
  private breakpointSubscription?: Subscription;

  constructor(
    private router: Router,
    public apiService: ApiService,
    private breakpointObserver: BreakpointObserver,
    public jwtService: JwtService,
    public themeService: ThemeService,
    public versionService: VersionService,
    private readonly tokenExpiry: TokenExpiryService,
    private navSections: NavSectionsService
  ) {}

  ngOnInit(): void {
    // Listen to route changes to determine when to show toolbar
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Hide toolbar on login page, show on all other pages
        this.shouldShowToolbar = !event.url.includes('/login');
        this.navSections.navigatedTo(event.urlAfterRedirects);
        this.checkBackendVersion();
      });

    // Initial check for current route
    this.shouldShowToolbar = !this.router.url.includes('/login');

    // Warn about an expiring session on every page
    this.tokenExpiry.start();

    // Set up responsive behavior for sidenav
    this.breakpointSubscription = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => {
        if (result.matches) {
          // Mobile: use overlay mode and close by default
          this.sidenavMode = 'over';
          this.sidenavOpened = false;
        } else {
          // Desktop: use side mode and open by default
          this.sidenavMode = 'side';
          this.sidenavOpened = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.tokenExpiry.stop();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.breakpointSubscription) {
      this.breakpointSubscription.unsubscribe();
    }
  }

  /**
   * Compare client and backend builds once logged in, so a mismatch is visible on every page.
   */
  private checkBackendVersion(): void {
    if (this.shouldShowToolbar && this.apiService.getAuthenticationStatus()) {
      this.versionService.check(this.apiService.getBaseUrl());
    }
  }

  /**
   * Move focus to the main content. The link's own fragment would resolve against
   * `<base href="/">` and leave the current page, so it is not followed.
   */
  skipToMainContent(event: Event): void {
    event.preventDefault();
    this.mainContent?.nativeElement.focus();
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  /**
   * Close sidenav when navigating on mobile devices
   */
  closeSidenavOnMobile(): void {
    if (this.sidenavMode === 'over') {
      this.sidenavOpened = false;
    }
  }

  get canAutoRefresh(): boolean {
    return this.apiService.canRefreshToken();
  }

  navigateToClientManagement(): void {
    this.router.navigate(['/clients']);
  }

  readonly keyChainRoles = KEY_CHAIN_ROLES;

  /**
   * Check if user has permission to manage Keycloak clients
   */
  hasRole(role: Role | Role[]): boolean {
    if (Array.isArray(role)) {
      return role.some((r) => this.jwtService.hasRole(r));
    } else {
      return this.jwtService.hasRole(role);
    }
  }
}
