import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { JwtService } from '../services/jwt.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRole = route.data['role'];
    if (this.jwtService.hasRole(requiredRole)) {
      return true;
    } else {
      this.router.navigate(['/']);
      this.snackBar.open('Access denied', 'Close', { duration: 3000 });
      return false;
    }
  }
}
