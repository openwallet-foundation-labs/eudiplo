import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, inject, provideAppInitializer } from '@angular/core';
import { ApiService } from '@eudiplo/sdk-angular';
import { environment } from '../environments/environment';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { client } from '@eudiplo/sdk-angular/api/client.gen';
import { provideHeyApiClient } from '@eudiplo/sdk-angular/api/client/client.gen';
import { authInterceptor } from '@eudiplo/sdk-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideHeyApiClient(client),
    provideAppInitializer(() => {
      const api = inject(ApiService);
      return api.login(environment.clientId, environment.clientSecret, environment.url)
          .then(() => {
            console.log('Verifier App logged in (app init)');
          })
          .catch((err) => {
            console.error('Verifier App login failed (app init)', err);
          });
    })
  ]
};
