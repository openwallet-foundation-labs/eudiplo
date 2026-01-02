import type { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { ClientListComponent } from './tenants/client/client-list/client-list.component';
import { ClientCreateComponent } from './tenants/client/client-create/client-create.component';
import { CredentialConfigCreateComponent } from './issuance/credential-config/credential-config-create/credential-config-create.component';
import { CredentialConfigListComponent } from './issuance/credential-config/credential-config-list/credential-config-list.component';
import { CredentialConfigShowComponent } from './issuance/credential-config/credential-config-show/credential-config-show.component';
import { IssuanceConfigCreateComponent } from './issuance/issuance-config/issuance-config-create/issuance-config-create.component';
import { IssuanceConfigShowComponent } from './issuance/issuance-config/issuance-config-show/issuance-config-show.component';
import { IssuanceOfferComponent } from './issuance/issuance-offer/issuance-offer.component';
import { KeyManagementCreateComponent } from './key-management/key-management-create/key-management-create.component';
import { KeyManagementListComponent } from './key-management/key-management-list/key-management-list.component';
import { KeyManagementShowComponent } from './key-management/key-management-show/key-management-show.component';
import { CertificatesOverviewComponent } from './key-management/certificates-overview/certificates-overview.component';
import { CertificateShowComponent } from './key-management/certificate-show/certificate-show.component';
import { CertificateEditComponent } from './key-management/certificate-edit/certificate-edit.component';
import { LoginComponent } from './login/login.component';
import { PresentationCreateComponent } from './presentation/presentation-config/presentation-create/presentation-create.component';
import { PresentationListComponent } from './presentation/presentation-config/presentation-list/presentation-list.component';
import { PresentationShowComponent } from './presentation/presentation-config/presentation-show/presentation-show.component';
import { PresentationOfferComponent } from './presentation/presentation-offer/presentation-offer.component';
import { SessionManagementListComponent } from './session-management/session-management-list/session-management-list.component';
import { SessionManagementShowComponent } from './session-management/session-management-show/session-management-show.component';
import { getRole } from './services/jwt.service';
import { RoleGuard } from './guards/roles.guard';
import { TenantCreateComponent } from './tenants/tenant-create/tenant-create.component';
import { TenantListComponent } from './tenants/tenant-list/tenant-list.component';
import { TenantShowComponent } from './tenants/tenant-show/tenant-show.component';
import { ClientShowComponent } from './tenants/client/client-show/client-show.component';
import { TrustListListComponent } from './trust-list/trust-list-list/trust-list-list.component';
import { TrustListShowComponent } from './trust-list/trust-list-show/trust-list-show.component';
import { TrustListEditComponent } from './trust-list/trust-list-edit/trust-list-edit.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
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
        component: ClientListComponent,
      },
      {
        path: 'create',
        component: ClientCreateComponent,
      },
      {
        path: ':id',
        component: ClientShowComponent,
      },
      {
        path: ':id/edit',
        component: ClientCreateComponent,
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
        component: TenantListComponent,
      },
      {
        path: 'create',
        component: TenantCreateComponent,
      },
      {
        path: ':id',
        component: TenantShowComponent,
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
            component: IssuanceOfferComponent,
          },
          {
            path: ':id',
            component: IssuanceOfferComponent,
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
            component: PresentationOfferComponent,
          },
          {
            path: ':id',
            component: PresentationOfferComponent,
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
        component: IssuanceConfigShowComponent,
      },
      {
        path: 'edit',
        component: IssuanceConfigCreateComponent,
      },
    ],
  },
  {
    path: 'key-management',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: KeyManagementListComponent,
      },
      {
        path: 'create',
        component: KeyManagementCreateComponent,
      },
      {
        path: ':id',
        component: KeyManagementShowComponent,
      },
      {
        path: ':id/edit',
        component: KeyManagementCreateComponent,
      },
      {
        path: ':keyId/certificate',
        component: CertificateEditComponent,
        data: { createMode: true },
      },
      {
        path: ':keyId/certificate/:certId',
        component: CertificateShowComponent,
      },
      {
        path: ':keyId/certificate/:certId/edit',
        component: CertificateEditComponent,
      },
    ],
  },
  {
    path: 'certificates',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: CertificatesOverviewComponent,
      },
      {
        path: 'create',
        component: CertificateEditComponent,
        data: { createMode: true },
      },
      {
        path: ':certId',
        component: CertificateShowComponent,
      },
      {
        path: ':certId/edit',
        component: CertificateEditComponent,
      },
    ],
  },
  {
    path: 'credential-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: CredentialConfigListComponent,
      },
      {
        path: 'create',
        component: CredentialConfigCreateComponent,
      },
      {
        path: ':id',
        component: CredentialConfigShowComponent,
      },
      {
        path: ':id/edit',
        component: CredentialConfigCreateComponent,
      },
    ],
  },
  {
    path: 'session-management',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: SessionManagementListComponent,
      },
      {
        path: ':id',
        component: SessionManagementShowComponent,
      },
    ],
  },
  {
    path: 'presentation-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: PresentationListComponent,
      },
      {
        path: 'create',
        component: PresentationCreateComponent,
      },
      {
        path: ':id',
        component: PresentationShowComponent,
      },
      {
        path: ':id/edit',
        component: PresentationCreateComponent,
      },
    ],
  },
  {
    path: 'trust-list',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: TrustListListComponent,
      },
      {
        path: 'create',
        component: TrustListEditComponent,
      },
      {
        path: ':id',
        component: TrustListShowComponent,
      },
      {
        path: ':id/edit',
        component: TrustListEditComponent,
      },
    ],
  },
];
