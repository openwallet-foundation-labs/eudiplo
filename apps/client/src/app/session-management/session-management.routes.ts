import type { Routes } from '@angular/router';
import { RoleGuard } from '../guards/roles.guard';
import { getRole } from '../services/jwt.service';

export const sessionManagementRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./session-management-list/session-management-list.component').then(
        (m) => m.SessionManagementListComponent
      ),
  },
  {
    path: 'config',
    canActivate: [RoleGuard],
    data: { role: getRole('issuance:manage') },
    loadComponent: () =>
      import('../session-config/session-config.component').then((m) => m.SessionConfigComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./session-management-show/session-management-show.component').then(
        (m) => m.SessionManagementShowComponent
      ),
  },
];
