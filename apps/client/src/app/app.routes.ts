import type { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { getRole } from './services/jwt.service';
import { RoleGuard } from './guards/roles.guard';

// Feature route imports
import {
  issuanceConfigRoutes,
  issuanceOfferRoutes,
  credentialConfigRoutes,
} from './issuance/issuance.routes';
import { keyManagementRoutes } from './key-management/key-management.routes';
import {
  presentationConfigRoutes,
  presentationOfferRoutes,
} from './presentation/presentation.routes';
import { sessionManagementRoutes } from './session-management/session-management.routes';
import { statusListRoutes } from './status-list-management/status-list.routes';
import { clientRoutes, tenantRoutes } from './tenants/tenants.routes';
import { trustListRoutes } from './trust-list/trust-list.routes';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Tenant & Client routes
  {
    path: 'clients',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('clients:manage') },
    children: clientRoutes,
  },
  {
    path: 'tenants',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('tenants:manage') },
    children: tenantRoutes,
  },

  // Offer routes (issuance & presentation)
  {
    path: 'offer',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'issuance',
        canActivate: [RoleGuard],
        data: { role: getRole('issuance:offer') },
        children: issuanceOfferRoutes,
      },
      {
        path: 'presentation',
        canActivate: [RoleGuard],
        data: { role: getRole('presentation:request') },
        children: presentationOfferRoutes,
      },
    ],
  },

  // Issuance routes
  {
    path: 'issuance-config',
    canActivate: [AuthGuard],
    children: issuanceConfigRoutes,
  },
  {
    path: 'credential-config',
    canActivate: [AuthGuard],
    children: credentialConfigRoutes,
  },

  // Key & Certificate routes
  {
    path: 'keys',
    canActivate: [AuthGuard],
    children: keyManagementRoutes,
  },

  // Registrar
  {
    path: 'registrar',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('registrar:manage') },
    loadComponent: () =>
      import('./registrar/registrar.component').then((m) => m.RegistrarComponent),
  },

  // Status list routes
  {
    path: 'status-lists',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('issuance:manage') },
    children: statusListRoutes,
  },
  {
    path: 'status-list-config',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('issuance:manage') },
    loadComponent: () =>
      import('./status-list-config/status-list-config.component').then(
        (m) => m.StatusListConfigComponent
      ),
  },

  // Session management routes
  {
    path: 'session-management',
    canActivate: [AuthGuard],
    children: sessionManagementRoutes,
  },

  // Presentation config routes
  {
    path: 'presentation-config',
    canActivate: [AuthGuard],
    children: presentationConfigRoutes,
  },

  // Trust list routes
  {
    path: 'trust-list',
    canActivate: [AuthGuard],
    children: trustListRoutes,
  },
];
