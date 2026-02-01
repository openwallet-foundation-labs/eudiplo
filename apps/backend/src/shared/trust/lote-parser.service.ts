import { Injectable } from "@nestjs/common";
import { LoTE } from "../../issuer/trust-list/dto/types";
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

@Injectable()
export class LoteParserService {
    /**
     * Parse a LoTE payload preserving TrustedEntity groupings.
     * This allows pairing issuance and revocation certificates from the same entity.
     */
    parse(root: LoTE): ParsedLoTE {
        const schemeInfo = root.ListAndSchemeInformation;

        const info: LoteInfo = {
            nextUpdate: schemeInfo.NextUpdate,
            listIssueDateTime: schemeInfo.ListIssueDateTime,
            schemeTerritory: schemeInfo.SchemeTerritory,
        };

        const rawEntities = root.TrustedEntitiesList ?? [];
        const entities: TrustedEntity[] = [];

        for (const te of rawEntities) {
            // Extract entity ID from TrustedEntityInformation.TEName (array of MultiLangString)
            // Use the first name's value as the entity identifier
            const teName = te.TrustedEntityInformation.TEName;
            const entityId = teName[0]?.value;

            const teServices = te.TrustedEntityServices;
            const entityServices: TrustedEntityServiceCert[] = [];

            for (const svc of teServices) {
                const svcInfo = svc.ServiceInformation;
                const serviceTypeIdentifier = svcInfo.ServiceTypeIdentifier!;
                const x509s =
                    svcInfo.ServiceDigitalIdentity.X509Certificates ?? [];
                for (const x of x509s) {
                    if (x.val) {
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
     * Filter entities to only include those that have at least one service matching the accepted types.
     * Keeps all services of matching entities (not just the matching services).
     */
    filterByServiceTypes(
        parsed: ParsedLoTE,
        accepted: ServiceTypeIdentifier[],
    ): ParsedLoTE {
        const set = new Set(accepted);

        const filteredEntities = parsed.entities.filter((entity) =>
            entity.services.some((s) => set.has(s.serviceTypeIdentifier)),
        );

        return {
            info: parsed.info,
            entities: filteredEntities,
        };
    }
}
