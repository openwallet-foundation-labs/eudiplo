import type { Routes } from '@angular/router';

export const schemaMetadataRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./schema-metadata-list/schema-metadata-list.component').then(
        (m) => m.SchemaMetadataListComponent
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./schema-metadata-create/schema-metadata-create.component').then(
        (m) => m.SchemaMetadataCreateComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./schema-metadata-show/schema-metadata-show.component').then(
        (m) => m.SchemaMetadataShowComponent
      ),
  },
];
