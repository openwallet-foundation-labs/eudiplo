import type { Routes } from '@angular/router';
import { RoleGuard } from '../guards/roles.guard';
import { getRole } from '../services/jwt.service';

export const schemaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./schema-list/schema-list.component').then((m) => m.SchemaListComponent),
  },
  {
    // `/schema` needs `registrar:manage`; publishing also needs `issuance:manage`.
    path: 'create',
    canActivate: [RoleGuard],
    data: { role: getRole('issuance:manage') },
    loadComponent: () =>
      import('./schema-create/schema-create.component').then((m) => m.SchemaCreateComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./schema-show/schema-show.component').then((m) => m.SchemaShowComponent),
  },
];
