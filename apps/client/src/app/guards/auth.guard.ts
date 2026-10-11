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
      // A kept session resumes on the login page and then returns to this page.
      const queryParams = this.apiService.hasKeptSession() ? { returnUrl: state.url } : undefined;
      this.router.navigate(['/login'], { queryParams });
      return false;
    }
  }
}
