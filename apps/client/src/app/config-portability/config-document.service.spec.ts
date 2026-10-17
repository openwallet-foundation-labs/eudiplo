import { TestBed } from '@angular/core/testing';
import { client } from '@eudiplo/sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '../services/jwt.service';
import { ConfigDocumentService } from './config-document.service';

describe('ConfigDocumentService', () => {
  function create(roles: string[]): ConfigDocumentService {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: JwtService,
          useValue: { hasRole: (role: string[]) => role.some((r) => roles.includes(r)) },
        },
      ],
    });
    return TestBed.inject(ConfigDocumentService);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
  });

  it('saves the document of a resource as <id>.json', async () => {
    const document = {
      $schema: 'https://eudiplo.dev/schemas/v2/CredentialConfigFile.schema.json',
      spec: { id: 'pid' },
    };
    const paths: string[] = [];
    client.setConfig({
      fetch: async (request: RequestInfo | URL) => {
        paths.push(new URL(request instanceof Request ? request.url : String(request)).pathname);
        return new Response(JSON.stringify(document), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    // jsdom has no object URLs; keep the file handed to the browser.
    const { createObjectURL, revokeObjectURL } = URL;
    const files: Blob[] = [];
    URL.createObjectURL = (blob: Blob) => (files.push(blob), 'blob:document');
    URL.revokeObjectURL = () => undefined;

    try {
      await expect(create(['issuance:manage']).download('CredentialConfig', 'pid')).resolves.toBe(
        'Configuration downloaded'
      );
    } finally {
      Object.assign(URL, { createObjectURL, revokeObjectURL });
    }

    expect(paths).toEqual(['/api/config-bundles/resources/CredentialConfig/pid/document']);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('pid.json');
    expect(JSON.parse(await files[0].text())).toEqual(document);
  });

  it('names the placeholders an import of the document needs', async () => {
    client.setConfig({
      fetch: async () =>
        new Response(
          JSON.stringify({
            $schema: 'https://eudiplo.dev/schemas/v1/WebhookEndpointConfigFile.schema.json',
            spec: {
              id: 'hook',
              auth: { config: { value: '${WEBHOOKENDPOINT_HOOK_AUTH_CONFIG_VALUE}' } },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        ),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { createObjectURL, revokeObjectURL } = URL;
    URL.createObjectURL = () => 'blob:document';
    URL.revokeObjectURL = () => undefined;

    try {
      await expect(create(['issuance:manage']).download('WebhookEndpoint', 'hook')).resolves.toBe(
        'Configuration downloaded. Its secrets are placeholders: set WEBHOOKENDPOINT_HOOK_AUTH_CONFIG_VALUE before importing it.'
      );
    } finally {
      Object.assign(URL, { createObjectURL, revokeObjectURL });
    }
  });

  it('offers a kind to the roles that manage it', () => {
    const service = create(['issuance:manage']);

    expect(service.canDownload('CredentialConfig')).toBe(true);
    expect(service.canDownload('PresentationConfig')).toBe(false);
  });

  it.each([
    ['WebhookEndpoint', 'presentation:manage', true],
    ['TrustList', 'issuance:manage', true],
    ['Tenant', 'presentation:manage', true],
    ['StatusList', 'presentation:manage', false],
    ['AttributeProvider', 'presentation:manage', false],
    ['RegistrarConfig', 'registrar:manage', true],
    ['Client', 'clients:manage', true],
    ['Client', 'issuance:manage', false],
    ['KmsConfig', 'issuance:manage', false],
    ['KmsConfig', 'tenant:admin', true],
  ] as const)('offers %s to %s: %s', (kind, role, offered) => {
    expect(create([role]).canDownload(kind)).toBe(offered);
  });

  it('offers key chains, which carry private keys, only to tenant administrators', () => {
    expect(create(['keys:manage', 'issuance:manage']).canDownload('KeyChain')).toBe(false);
    TestBed.resetTestingModule();
    expect(create(['tenant:admin']).canDownload('KeyChain')).toBe(true);
  });
});
