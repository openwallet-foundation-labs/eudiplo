import { Injectable } from '@angular/core';
import {
  schemaMetadataControllerDeprecateVersion,
  schemaMetadataControllerFindAll,
  schemaMetadataControllerGetMine,
  schemaMetadataControllerFindOne,
  schemaMetadataControllerGetJwt,
  schemaMetadataControllerGetLatest,
  schemaMetadataControllerGetVocabularies,
  schemaMetadataControllerGetVersions,
  schemaMetadataControllerPublishSchemaMetadata,
  schemaMetadataControllerPublishSchemaMetadataVersion,
  schemaMetadataControllerRemove,
  schemaMetadataControllerUpdate,
  type DeprecateSchemaMetadataDto,
  type PublishSchemaMetaConfig,
  type SchemaMetadataResponseDto,
  type SchemaMetadataVocabulariesDto,
  type UpdateSchemaMetadataDto,
} from '@eudiplo/sdk-core';

/**
 * Re-exports of schema-metadata DTOs from the generated SDK.
 */
export type SchemaMetadata = SchemaMetadataResponseDto;
export type SchemaMetadataVocabularies = SchemaMetadataVocabulariesDto;

@Injectable({
  providedIn: 'root',
})
export class SchemaService {
  /** The registrar's category and tag vocabularies, with empty lists for missing ones. */
  async getVocabularies(): Promise<SchemaMetadataVocabularies> {
    const response = await schemaMetadataControllerGetVocabularies();
    const vocabularies = response.data as Partial<SchemaMetadataVocabularies> | undefined;

    return {
      version: vocabularies?.version ?? '',
      categories: Array.isArray(vocabularies?.categories) ? vocabularies.categories : [],
      tags: Array.isArray(vocabularies?.tags) ? vocabularies.tags : [],
    };
  }

  async list(params?: { attestationId?: string; version?: string }): Promise<SchemaMetadata[]> {
    const response = await schemaMetadataControllerFindAll({
      query: {
        ...(params?.attestationId ? { attestationId: params.attestationId } : {}),
        ...(params?.version ? { version: params.version } : {}),
      },
    });

    return response.data ?? [];
  }

  async listMine(): Promise<SchemaMetadata[]> {
    const response = await schemaMetadataControllerGetMine();

    return response.data ?? [];
  }

  async getById(id: string): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerFindOne({
      path: { id },
    });

    return response.data as SchemaMetadata;
  }

  async updateMetadata(
    id: string,
    version: string,
    body: UpdateSchemaMetadataDto
  ): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerUpdate({
      path: { id, version },
      body,
    });

    return response.data as SchemaMetadata;
  }

  async delete(id: string, version: string): Promise<void> {
    await schemaMetadataControllerRemove({
      path: { id, version },
    });
  }

  async getSignedJwt(id: string, version: string): Promise<string> {
    const response = await schemaMetadataControllerGetJwt({
      path: { id, version },
    });

    return response.data as string;
  }

  async getLatest(id: string): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerGetLatest({
      path: { id },
    });

    return response.data as SchemaMetadata;
  }

  async getVersions(id: string): Promise<SchemaMetadata[]> {
    const response = await schemaMetadataControllerGetVersions({
      path: { id },
    });

    return (response.data ?? []) as SchemaMetadata[];
  }

  async deprecateVersion(
    id: string,
    version: string,
    body: DeprecateSchemaMetadataDto
  ): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerDeprecateVersion({
      path: { id, version },
      body,
    });

    return response.data as SchemaMetadata;
  }

  /**
   * Publishes the supplied schema metadata config (with existing `id`) as a
   * new version via the non-deprecated publish-version endpoint.
   */
  async publishSchemaMetadataVersion(
    config: PublishSchemaMetaConfig,
    keyChainId?: string,
    credentialConfigId?: string,
    pinMode?: 'keep_current' | 'update_to_new_version' | 'replace_id'
  ): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerPublishSchemaMetadataVersion({
      body: {
        config,
        ...(keyChainId ? { keyChainId } : {}),
        ...(credentialConfigId ? { credentialConfigId } : {}),
        ...(pinMode ? { pinMode } : {}),
      },
    });

    return response.data as SchemaMetadata;
  }

  /**
   * Reserve an attestation id at the registrar and publish the supplied
   * schema metadata config in a single backend round-trip. Returns the
   * registrar's metadata entry for the freshly created attestation.
   *
   * `keyChainId` is optional (defaults to the tenant's default key chain).
   */
  async publishSchemaMetadata(
    config: Omit<PublishSchemaMetaConfig, 'id'>,
    keyChainId?: string,
    credentialConfigId?: string,
    pinMode?: 'keep_current' | 'update_to_new_version' | 'replace_id'
  ): Promise<SchemaMetadata> {
    const response = await schemaMetadataControllerPublishSchemaMetadata({
      body: {
        config,
        ...(keyChainId ? { keyChainId } : {}),
        ...(credentialConfigId ? { credentialConfigId } : {}),
        ...(pinMode ? { pinMode } : {}),
      },
    });

    return response.data as SchemaMetadata;
  }
}
