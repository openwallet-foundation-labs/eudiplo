import type { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { ClientListComponent } from './tenants/client-list/client-list.component';
import { ClientCreateComponent } from './tenants/client-create/client-create.component';
import { CredentialConfigCreateComponent } from './issuance/credential-config/credential-config-create/credential-config-create.component';
import { CredentialConfigListComponent } from './issuance/credential-config/credential-config-list/credential-config-list.component';
import { CredentialConfigShowComponent } from './issuance/credential-config/credential-config-show/credential-config-show.component';
import { IssuanceConfigCreateComponent } from './issuance/issuance-config/issuance-config-create/issuance-config-create.component';
import { IssuanceConfigListComponent } from './issuance/issuance-config/issuance-config-list/issuance-config-list.component';
import { IssuanceConfigShowComponent } from './issuance/issuance-config/issuance-config-show/issuance-config-show.component';
import { IssuanceOfferComponent } from './issuance/issuance-offer/issuance-offer.component';
import { KeyManagementCreateComponent } from './key-management/key-management-create/key-management-create.component';
import { KeyManagementListComponent } from './key-management/key-management-list/key-management-list.component';
import { KeyManagementShowComponent } from './key-management/key-management-show/key-management-show.component';
import { LoginComponent } from './login/login.component';
import { PresentationCreateComponent } from './presentation/presentation-config/presentation-create/presentation-create.component';
import { PresentationListComponent } from './presentation/presentation-config/presentation-list/presentation-list.component';
import { PresentationShowComponent } from './presentation/presentation-config/presentation-show/presentation-show.component';
import { PresentationOfferComponent } from './presentation/presentation-offer/presentation-offer.component';
import { SessionManagementListComponent } from './session-management/session-management-list/session-management-list.component';
import { SessionManagementShowComponent } from './session-management/session-management-show/session-management-show.component';
import { DisplayComponent } from './issuance/display/display.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'display',
    component: DisplayComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'offer',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'clients',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ClientListComponent,
      },
      {
        path: 'create',
        component: ClientCreateComponent,
      },
    ],
  },
  {
    path: 'offer',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'issuance',
        component: IssuanceOfferComponent,
      },
      {
        path: 'issuance/:id',
        component: IssuanceOfferComponent,
      },
      {
        path: 'presentation',
        component: PresentationOfferComponent,
      },
    ],
  },
  {
    path: 'issuance-config',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: IssuanceConfigListComponent,
      },
      {
        path: 'create',
        component: IssuanceConfigCreateComponent,
      },
      {
        path: ':id',
        component: IssuanceConfigShowComponent,
      },
      {
        path: ':id/edit',
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
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
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
];
