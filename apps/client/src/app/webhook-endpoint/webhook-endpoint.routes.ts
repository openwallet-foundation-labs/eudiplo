import type { Routes } from '@angular/router';

export const webhookEndpointRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./webhook-endpoint-list/webhook-endpoint-list.component').then(
        (m) => m.WebhookEndpointListComponent
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./webhook-endpoint-create/webhook-endpoint-create.component').then(
        (m) => m.WebhookEndpointCreateComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./webhook-endpoint-show/webhook-endpoint-show.component').then(
        (m) => m.WebhookEndpointShowComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./webhook-endpoint-create/webhook-endpoint-create.component').then(
        (m) => m.WebhookEndpointCreateComponent
      ),
  },
];
