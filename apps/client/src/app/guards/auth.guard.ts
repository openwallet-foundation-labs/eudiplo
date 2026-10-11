import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { ApiService } from '../core';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.apiService.getAuthenticationStatus()) {
      return true;
    } else {
      // A kept session resumes on the login page, and signing in again as the client of an
      // ended session returns to this page.
      const returnsHere = this.apiService.hasKeptSession() || this.apiService.hasEndedSession();
      const queryParams = returnsHere ? { returnUrl: state.url } : undefined;
      this.router.navigate(['/login'], { queryParams });
      return false;
    }
  }
}
