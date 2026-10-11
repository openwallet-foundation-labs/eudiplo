import { inject } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { ApiRefusalService } from './api-refusal.service';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  // Inject the current `AuthService` and use it to get an authentication token:
  const apiService = inject(ApiService);
  const refusals = inject(ApiRefusalService);
  // The token of this request, not the one current when its answer arrives.
  const authToken = apiService.accessToken;

  // Clone the request to add the authentication header.
  const newReq = req.clone({
    headers: req.headers.append('Authorization', `Bearer ${authToken}`),
  });
  // Calls of the management API that do not go through the SDK client.
  const baseUrl = apiService.getBaseUrl();
  const managementApi = !!baseUrl && req.url.startsWith(`${baseUrl}/api/`);
  return next(newReq).pipe(
    tap({
      error: (error: unknown) => {
        if (managementApi && error instanceof HttpErrorResponse) {
          refusals.handleApiResponse(error.status, authToken);
        }
      },
    })
  );
}
