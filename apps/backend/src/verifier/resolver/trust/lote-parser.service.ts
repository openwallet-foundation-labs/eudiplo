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

/**
 * Parsed LoTE preserving TrustedEntity groupings.
 * This is important for pairing issuance and revocation certificates from the same entity.
 */
export type ParsedLoTE = {
    info: LoteInfo;
    /** TrustedEntities with their services grouped */
    entities: TrustedEntity[];
};

function get(obj: any, path: string[]): any {
    return path.reduce(
        (o, k) => (o?.[k] === undefined ? undefined : o[k]),
        obj,
    );
}

@Injectable()
export class LoteParserService {
    /**
     * Parse a LoTE payload preserving TrustedEntity groupings.
     * This allows pairing issuance and revocation certificates from the same entity.
     */
    parse(lotePayload: any): ParsedLoTE {
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

        return { info, entities };
    }

    /**
     * Filter entities to only include those with services matching the accepted types.
     * Preserves the entity grouping.
     */
    filterByServiceTypes(
        parsed: ParsedLoTE,
        accepted: ServiceTypeIdentifier[],
    ): ParsedLoTE {
        const set = new Set(accepted);

        const filteredEntities = parsed.entities
            .map((entity) => ({
                entityId: entity.entityId,
                services: entity.services.filter((s) =>
                    set.has(s.serviceTypeIdentifier),
                ),
            }))
            .filter((entity) => entity.services.length > 0);

        return {
            info: parsed.info,
            entities: filteredEntities,
        };
    }
}
