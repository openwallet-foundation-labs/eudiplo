import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { client } from '@eudiplo/sdk/api/client.gen';
import { provideHeyApiClient } from '@eudiplo/sdk/api/client/client.gen';
import { authInterceptor } from '@eudiplo/sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideHeyApiClient(client),
  ]
};
