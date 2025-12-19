import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'import',
    loadComponent: () =>
      import('./credentials-import/credentials-import.component').then(
        (m) => m.CredentialsImportComponent
      ),
  },
  {
    path: 'config',
    loadComponent: () =>
      import('./presentation-config/presentation-config.component').then(
        (m) => m.PresentationConfigComponent
      ),
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./verification-status/verification-status.component').then(
        (m) => m.VerificationStatusComponent
      ),
  },
  { path: '', redirectTo: 'import', pathMatch: 'full' },
];
