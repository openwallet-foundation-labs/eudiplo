import { Injectable } from '@angular/core';
import { configPortabilityControllerExportDocument } from '@eudiplo/sdk-core';
import { ApiService } from '../core';
import { downloadJsonFile } from '../common/download-json.util';
import { JwtService, type Role } from '../services/jwt.service';
import type { ConfigResourceKind } from './config-ownership.service';

const ADMIN_ROLES: Role[] = ['tenant:admin', 'tenants:manage'];

/**
 * Roles that may download a resource of each kind as a configuration
 * document, mirroring `mayExportConfigDocument` in the backend. A key chain
 * document carries the private keys of keys held in the database.
 */
const CONFIG_DOCUMENT_ROLES: Record<ConfigResourceKind, Role[]> = {
  Tenant: [...ADMIN_ROLES, 'issuance:manage', 'presentation:manage'],
  Client: [...ADMIN_ROLES, 'clients:manage'],
  KmsConfig: ADMIN_ROLES,
  KeyChain: ADMIN_ROLES,
  RegistrarConfig: [...ADMIN_ROLES, 'registrar:manage'],
  IssuanceConfig: [...ADMIN_ROLES, 'issuance:manage'],
  CredentialConfig: [...ADMIN_ROLES, 'issuance:manage'],
  PresentationConfig: [...ADMIN_ROLES, 'presentation:manage'],
  AttributeProvider: [...ADMIN_ROLES, 'issuance:manage'],
  WebhookEndpoint: [...ADMIN_ROLES, 'issuance:manage', 'presentation:manage'],
  TrustList: [...ADMIN_ROLES, 'issuance:manage', 'presentation:manage'],
  StatusList: [...ADMIN_ROLES, 'issuance:manage'],
};

/**
 * Downloads one resource as a configuration document (`$schema` and `spec`),
 * the file format of the config folder, so the file can be imported again.
 */
@Injectable({ providedIn: 'root' })
export class ConfigDocumentService {
  constructor(
    private readonly api: ApiService,
    private readonly jwt: JwtService
  ) {}

  canDownload(kind: ConfigResourceKind): boolean {
    return this.jwt.hasRole(CONFIG_DOCUMENT_ROLES[kind]);
  }

  /**
   * Saves the document as `<id>.json`, the file name the config folder uses,
   * and returns the message to show: secrets in the document are `${…}`
   * placeholders that an import needs as environment variables.
   */
  async download(kind: ConfigResourceKind, id: string): Promise<string> {
    const result = await configPortabilityControllerExportDocument<true>({
      client: this.api.client,
      path: { kind, id },
    });
    downloadJsonFile(result.data, `${id}.json`);
    const placeholders = [
      ...new Set(
        Array.from(JSON.stringify(result.data).matchAll(/\$\{(\w+)\}/g), ([, name]) => name)
      ),
    ];
    return placeholders.length
      ? `Configuration downloaded. Its secrets are placeholders: set ${placeholders.join(', ')} before importing it.`
      : 'Configuration downloaded';
  }
}
