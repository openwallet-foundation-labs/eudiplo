import { Injectable } from "@nestjs/common";
import { ServiceTypeIdentifier } from "./types";

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

export type ParsedLoTE = {
    info: LoteInfo;
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

        const entities = root?.TrustedEntitiesList ?? [];
        const services: LoteServiceCert[] = [];

        for (const te of entities) {
            const teServices = te?.TrustedEntityServices ?? [];
            for (const svc of teServices) {
                const svcInfo = svc?.ServiceInformation;
                const serviceTypeIdentifier = svcInfo?.ServiceTypeIdentifier;
                const x509s =
                    svcInfo?.ServiceDigitalIdentity?.X509Certificates ?? [];
                for (const x of x509s) {
                    if (x?.val) {
                        services.push({
                            serviceTypeIdentifier,
                            certValue: x.val,
                        });
                    }
                }
            }
        }

        return { info, services };
    }

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
