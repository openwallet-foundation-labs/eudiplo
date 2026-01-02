import { Injectable } from "@nestjs/common";
import {
    ServiceTypeIdentifier,
    TrustedEntity,
    TrustedEntityServiceCert,
} from "./types";

export type LoteInfo = {
    nextUpdate?: string;
    listIssueDateTime?: string;
    schemeTerritory?: string;
};

export type LoteServiceCert = {
    serviceTypeIdentifier: string;
    // PEM text or base64 DER; TS 119 602 allows X.509 cert values, often PEM
    certValue: string;
};

/**
 * @deprecated Use ParsedLoTEv2 instead which preserves TrustedEntity grouping
 */
export type ParsedLoTE = {
    info: LoteInfo;
    services: LoteServiceCert[];
};

/**
 * Parsed LoTE preserving TrustedEntity groupings.
 * This is important for pairing issuance and revocation certificates from the same entity.
 */
export type ParsedLoTEv2 = {
    info: LoteInfo;
    /** TrustedEntities with their services grouped */
    entities: TrustedEntity[];
    /** @deprecated Flattened services for backwards compatibility */
    services: LoteServiceCert[];
};

function get(obj: any, path: string[]): any {
    return path.reduce(
        (o, k) => (o && o[k] !== undefined ? o[k] : undefined),
        obj,
    );
}

@Injectable()
export class LoteParserService {
    /**
     * Parse a LoTE payload preserving TrustedEntity groupings.
     * This allows pairing issuance and revocation certificates from the same entity.
     */
    parseV2(lotePayload: any): ParsedLoTEv2 {
        const root = lotePayload?.LoTE ?? lotePayload; // tolerate wrappers

        const info: LoteInfo = {
            nextUpdate:
                get(root, ["ListAndSchemeInformation", "NextUpdate"]) ??
                get(root, ["ListAndSchemeInformation", "NextUpdate", "value"]),
            listIssueDateTime:
                get(root, ["ListAndSchemeInformation", "ListIssueDateTime"]) ??
                get(root, [
                    "ListAndSchemeInformation",
                    "ListIssueDateTime",
                    "value",
                ]),
            schemeTerritory: get(root, [
                "ListAndSchemeInformation",
                "SchemeTerritory",
            ]),
        };

        const rawEntities = root?.TrustedEntitiesList ?? [];
        const entities: TrustedEntity[] = [];
        const services: LoteServiceCert[] = []; // For backwards compatibility

        for (const te of rawEntities) {
            const entityId = te?.TrustedEntityIdentifier ?? undefined;
            const teServices = te?.TrustedEntityServices ?? [];
            const entityServices: TrustedEntityServiceCert[] = [];

            for (const svc of teServices) {
                const svcInfo = svc?.ServiceInformation;
                const serviceTypeIdentifier = svcInfo?.ServiceTypeIdentifier;
                const x509s =
                    svcInfo?.ServiceDigitalIdentity?.X509Certificates ?? [];

                for (const x of x509s) {
                    if (x?.val) {
                        const serviceCert: TrustedEntityServiceCert = {
                            serviceTypeIdentifier,
                            certValue: x.val,
                        };
                        entityServices.push(serviceCert);

                        // Also add to flat services for backwards compatibility
                        services.push({
                            serviceTypeIdentifier,
                            certValue: x.val,
                        });
                    }
                }
            }

            if (entityServices.length > 0) {
                entities.push({
                    entityId,
                    services: entityServices,
                });
            }
        }

        return { info, entities, services };
    }

    /**
     * @deprecated Use parseV2 instead to preserve TrustedEntity groupings
     */
    parse(lotePayload: any): ParsedLoTE {
        const result = this.parseV2(lotePayload);
        return {
            info: result.info,
            services: result.services,
        };
    }

    /**
     * Filter entities to only include those with services matching the accepted types.
     * Preserves the entity grouping.
     */
    filterEntitiesByServiceTypes(
        parsed: ParsedLoTEv2,
        accepted: ServiceTypeIdentifier[],
    ): ParsedLoTEv2 {
        const set = new Set(accepted);

        const filteredEntities = parsed.entities
            .map((entity) => ({
                entityId: entity.entityId,
                services: entity.services.filter((s) =>
                    set.has(s.serviceTypeIdentifier),
                ),
            }))
            .filter((entity) => entity.services.length > 0);

        const filteredServices = parsed.services.filter((s) =>
            set.has(s.serviceTypeIdentifier),
        );

        return {
            info: parsed.info,
            entities: filteredEntities,
            services: filteredServices,
        };
    }

    /**
     * @deprecated Use filterEntitiesByServiceTypes instead
     */
    filterByServiceTypes(
        parsed: ParsedLoTE,
        accepted: ServiceTypeIdentifier[],
    ): ParsedLoTE {
        const set = new Set(accepted);
        return {
            info: parsed.info,
            services: parsed.services.filter((s) =>
                set.has(s.serviceTypeIdentifier),
            ),
        };
    }
}
