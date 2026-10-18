import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  type CreateFederationTrustAnchorDto,
  type FederationTrustAnchorResponseDto,
  type UpdateFederationTrustAnchorDto,
  federationTrustAnchorControllerCreate,
  federationTrustAnchorControllerDelete,
  federationTrustAnchorControllerGetAll,
  federationTrustAnchorControllerGetById,
  federationTrustAnchorControllerUpdate,
} from '@eudiplo/sdk-core';

export type FederationTrustAnchor = FederationTrustAnchorResponseDto;

/**
 * The tenant's OpenID Federation trust anchors with their pinned federation
 * keys. Issuance and presentation configurations name them by entity ID.
 */
@Injectable({ providedIn: 'root' })
export class FederationTrustAnchorService {
  /** Shared by the pickers of one page, so several of them load the list once. */
  private registered?: Promise<FederationTrustAnchor[]>;
  /** The list the last successful load returned, for checks that cannot wait. */
  private lastLoaded?: FederationTrustAnchor[];
  private readonly loadedSubject = new Subject<FederationTrustAnchor[]>();
  /** Each list a load returns, so every picker of a page shows the same one. */
  readonly loaded = this.loadedSubject.asObservable();

  async getAll(): Promise<FederationTrustAnchor[]> {
    const response = await federationTrustAnchorControllerGetAll();
    return response.data ?? [];
  }

  /**
   * The registered trust anchors, loaded once and shared until `reload` is
   * true; a failed load is not kept, so the next call tries again.
   */
  registeredAnchors(reload = false): Promise<FederationTrustAnchor[]> {
    if (reload || !this.registered) {
      const request = this.getAll();
      this.registered = request;
      request.then(
        (anchors) => {
          if (this.registered !== request) return;
          this.lastLoaded = anchors;
          this.loadedSubject.next(anchors);
        },
        () => {
          if (this.registered === request) this.registered = undefined;
        }
      );
    }
    return this.registered;
  }

  /**
   * The entity IDs of the registered trust anchors as last loaded by
   * `registeredAnchors`, or undefined while they are not known.
   */
  registeredEntityIds(): Set<string> | undefined {
    return this.lastLoaded && new Set(this.lastLoaded.map((anchor) => anchor.entityId));
  }

  /** After a write the list is loaded again, and not known until then. */
  private forget(): void {
    this.registered = undefined;
    this.lastLoaded = undefined;
  }

  async getById(id: string): Promise<FederationTrustAnchor> {
    const response = await federationTrustAnchorControllerGetById({ path: { id } });
    return response.data;
  }

  async create(body: CreateFederationTrustAnchorDto): Promise<FederationTrustAnchor> {
    const response = await federationTrustAnchorControllerCreate({ body });
    this.forget();
    return response.data;
  }

  async update(id: string, body: UpdateFederationTrustAnchorDto): Promise<FederationTrustAnchor> {
    const response = await federationTrustAnchorControllerUpdate({ path: { id }, body });
    this.forget();
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await federationTrustAnchorControllerDelete({ path: { id } });
    this.forget();
  }
}

/** Where the trust anchor publishes its entity configuration (OpenID Federation 1.0 Section 9). */
export function entityConfigurationUri(entityId: string): string {
  return `${entityId.replace(/\/+$/, '')}/.well-known/openid-federation`;
}

/**
 * True when the value is an Entity Identifier as the backend accepts it: an
 * `https` URL with a host and without query or fragment.
 */
export function isFederationEntityId(value: string): boolean {
  if (value.includes('?') || value.includes('#')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}
