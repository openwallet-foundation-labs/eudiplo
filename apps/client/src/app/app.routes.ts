import type { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { getRole } from './services/jwt.service';
import { RoleGuard } from './guards/roles.guard';

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
  {
    path: 'clients',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('clients:manage') },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./tenants/client/client-list/client-list.component').then(
            (m) => m.ClientListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./tenants/client/client-create/client-create.component').then(
            (m) => m.ClientCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./tenants/client/client-show/client-show.component').then(
            (m) => m.ClientShowComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./tenants/client/client-create/client-create.component').then(
            (m) => m.ClientCreateComponent
          ),
      },
    ],
  },
  {
    path: 'tenants',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('tenants:manage') },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./tenants/tenant-list/tenant-list.component').then((m) => m.TenantListComponent),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./tenants/tenant-create/tenant-create.component').then(
            (m) => m.TenantCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./tenants/tenant-show/tenant-show.component').then((m) => m.TenantShowComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./tenants/tenant-create/tenant-create.component').then(
            (m) => m.TenantCreateComponent
          ),
      },
    ],
  },
  {
    path: 'offer',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'issuance',
        canActivate: [RoleGuard],
        data: { role: getRole('issuance:offer') },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./issuance/issuance-offer/issuance-offer.component').then(
                (m) => m.IssuanceOfferComponent
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./issuance/issuance-offer/issuance-offer.component').then(
                (m) => m.IssuanceOfferComponent
              ),
          },
        ],
      },
      {
        path: 'presentation',
        canActivate: [RoleGuard],
        data: { role: getRole('presentation:offer') },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./presentation/presentation-offer/presentation-offer.component').then(
                (m) => m.PresentationOfferComponent
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./presentation/presentation-offer/presentation-offer.component').then(
                (m) => m.PresentationOfferComponent
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'issuance-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./issuance/issuance-config/issuance-config-show/issuance-config-show.component').then(
            (m) => m.IssuanceConfigShowComponent
          ),
      },
      {
        path: 'edit',
        loadComponent: () =>
          import('./issuance/issuance-config/issuance-config-create/issuance-config-create.component').then(
            (m) => m.IssuanceConfigCreateComponent
          ),
      },
    ],
  },
  {
    path: 'keys',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./key-management/key-management-list/key-management-list.component').then(
            (m) => m.KeyManagementListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./key-management/key-management-create/key-management-create.component').then(
            (m) => m.KeyManagementCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./key-management/key-management-show/key-management-show.component').then(
            (m) => m.KeyManagementShowComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./key-management/key-management-create/key-management-create.component').then(
            (m) => m.KeyManagementCreateComponent
          ),
      },
      {
        path: ':keyId/certificate',
        loadComponent: () =>
          import('./key-management/certificate-edit/certificate-edit.component').then(
            (m) => m.CertificateEditComponent
          ),
        data: { createMode: true },
      },
      {
        path: ':keyId/certificate/:certId',
        loadComponent: () =>
          import('./key-management/certificate-show/certificate-show.component').then(
            (m) => m.CertificateShowComponent
          ),
      },
      {
        path: ':keyId/certificate/:certId/edit',
        loadComponent: () =>
          import('./key-management/certificate-edit/certificate-edit.component').then(
            (m) => m.CertificateEditComponent
          ),
      },
    ],
  },
  {
    path: 'certificates',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./key-management/certificates-overview/certificates-overview.component').then(
            (m) => m.CertificatesOverviewComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./key-management/certificate-edit/certificate-edit.component').then(
            (m) => m.CertificateEditComponent
          ),
        data: { createMode: true },
      },
      {
        path: ':certId',
        loadComponent: () =>
          import('./key-management/certificate-show/certificate-show.component').then(
            (m) => m.CertificateShowComponent
          ),
      },
      {
        path: ':certId/edit',
        loadComponent: () =>
          import('./key-management/certificate-edit/certificate-edit.component').then(
            (m) => m.CertificateEditComponent
          ),
      },
    ],
  },
  {
    path: 'registrar',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('registrar:manage') },
    loadComponent: () =>
      import('./registrar/registrar.component').then((m) => m.RegistrarComponent),
  },
  {
    path: 'credential-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./issuance/credential-config/credential-config-list/credential-config-list.component').then(
            (m) => m.CredentialConfigListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./issuance/credential-config/credential-config-create/credential-config-create.component').then(
            (m) => m.CredentialConfigCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./issuance/credential-config/credential-config-show/credential-config-show.component').then(
            (m) => m.CredentialConfigShowComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./issuance/credential-config/credential-config-create/credential-config-create.component').then(
            (m) => m.CredentialConfigCreateComponent
          ),
      },
    ],
  },
  {
    path: 'status-lists',
    canActivate: [AuthGuard, RoleGuard],
    data: { role: getRole('issuance:manage') },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./status-list-management/status-list-list/status-list-list.component').then(
            (m) => m.StatusListListComponent
          ),
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./status-list-config/status-list-config.component').then(
            (m) => m.StatusListConfigComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./status-list-management/status-list-edit/status-list-edit.component').then(
            (m) => m.StatusListEditComponent
          ),
      },
      {
        path: ':listId',
        loadComponent: () =>
          import('./status-list-management/status-list-edit/status-list-edit.component').then(
            (m) => m.StatusListEditComponent
          ),
      },
    ],
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
  {
    path: 'session-management',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./session-management/session-management-list/session-management-list.component').then(
            (m) => m.SessionManagementListComponent
          ),
      },
      {
        path: 'config',
        canActivate: [RoleGuard],
        data: { role: getRole('issuance:manage') },
        loadComponent: () =>
          import('./session-config/session-config.component').then((m) => m.SessionConfigComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./session-management/session-management-show/session-management-show.component').then(
            (m) => m.SessionManagementShowComponent
          ),
      },
    ],
  },
  {
    path: 'presentation-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./presentation/presentation-config/presentation-list/presentation-list.component').then(
            (m) => m.PresentationListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./presentation/presentation-config/presentation-create/presentation-create.component').then(
            (m) => m.PresentationCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./presentation/presentation-config/presentation-show/presentation-show.component').then(
            (m) => m.PresentationShowComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./presentation/presentation-config/presentation-create/presentation-create.component').then(
            (m) => m.PresentationCreateComponent
          ),
      },
      {
        path: ':id/copy',
        loadComponent: () =>
          import('./presentation/presentation-config/presentation-create/presentation-create.component').then(
            (m) => m.PresentationCreateComponent
          ),
      },
    ],
  },
  {
    path: 'trust-list',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./trust-list/trust-list-list/trust-list-list.component').then(
            (m) => m.TrustListListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./trust-list/trust-list-edit/trust-list-edit.component').then(
            (m) => m.TrustListEditComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./trust-list/trust-list-show/trust-list-show.component').then(
            (m) => m.TrustListShowComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./trust-list/trust-list-edit/trust-list-edit.component').then(
            (m) => m.TrustListEditComponent
          ),
      },
    ],
  },
];
