import type { Routes } from '@angular/router';
import { RoleGuard } from '../guards/roles.guard';
import { getRole } from '../services/jwt.service';
import { SESSION_READER_ROLES } from './session-roles';

export const sessionManagementRoutes: Routes = [
  {
    path: '',
    canActivate: [RoleGuard],
    data: { role: SESSION_READER_ROLES },
    loadComponent: () =>
      import('./session-management-list/session-management-list.component').then(
        (m) => m.SessionManagementListComponent
      ),
  },
  {
    path: 'config',
    canActivate: [RoleGuard],
    data: { role: [getRole('issuance:manage'), getRole('presentation:manage')] },
    loadComponent: () =>
      import('../session-config/session-config.component').then((m) => m.SessionConfigComponent),
  },
  {
    path: ':id',
    canActivate: [RoleGuard],
    data: { role: SESSION_READER_ROLES },
    loadComponent: () =>
      import('./session-management-show/session-management-show.component').then(
        (m) => m.SessionManagementShowComponent
      ),
  },
];
