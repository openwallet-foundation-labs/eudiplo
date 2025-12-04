import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideRouter } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { routes } from './app.routes';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyMaterial } from '@ngx-formly/material';
import { ObjectTypeComponent } from './types/object.type';
import { ArrayTypeComponent } from './types/array.type';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import schemas from './utils/schemas.json';
import { provideHeyApiClient } from '@eudiplo/sdk/client/client.gen';
import { client } from '@eudiplo/sdk/client.gen';
import { authInterceptor } from '../../../../packages/eudiplo-sdk/src/auth.interceptor';

declare let monaco: any;

export function onMonacoLoad() {
  monaco.languages.json.jsonDefaults.diagnosticsOptions.enableSchemaRequest = true;
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas,
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(FlexLayoutModule),
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideHeyApiClient(client),
    provideMonacoEditor({
      baseUrl: window.location.origin + '/assets/monaco/min/vs',
      onMonacoLoad,
      //monacoRequire: (window as any).monacoRequire,
      //requireConfig: { preferScriptTags: true }
    }),
    provideFormlyCore([
      ...withFormlyMaterial(),
      {
        types: [
          //{ name: 'null', component: NullTypeComponent, wrappers: ['form-field'] },
          { name: 'array', component: ArrayTypeComponent },
          { name: 'object', component: ObjectTypeComponent },
          //{ name: 'multischema', component: MultiSchemaTypeComponent },
        ],
      },
    ]),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },
  ],
};
