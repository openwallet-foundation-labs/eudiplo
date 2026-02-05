import { CoseKey, DeviceKey, Issuer, SignatureAlgorithm } from "@animo-id/mdoc";
import { Injectable, Logger } from "@nestjs/common";
import type { Jwk } from "@openid4vc/oauth2";
import { X509Certificate } from "@peculiar/x509";
import { exportJWK } from "jose";
import { CertService } from "../../../../../crypto/key/cert/cert.service";
import { CertUsage } from "../../../../../crypto/key/entities/cert-usage.entity";
import { Session } from "../../../../../session/entities/session.entity";
import { mdocContext } from "../../../../../verifier/presentations/mdl-context";
import { CredentialConfig } from "../../entities/credential.entity";

export interface MdocIssueOptions {
    credentialConfiguration: CredentialConfig;
    deviceKey: Jwk;
    session: Session;
    claims: Record<string, any>;
}

/**
 * Service for issuing mDOC/mDL credentials following ISO 18013-5.
 */
@Injectable()
export class MdocIssuerService {
    private readonly logger = new Logger(MdocIssuerService.name);

    constructor(private readonly certService: CertService) {}

    /**
     * Issues an mDOC credential.
     * @param options - The issuance options
     * @returns The issued mDOC credential as base64url encoded string for OID4VCI
     */
    async issue(options: MdocIssueOptions): Promise<string> {
        const { credentialConfiguration, deviceKey, session, claims } = options;

        // Get the docType from the credential configuration
        // Support both docType (camelCase) and doctype (lowercase per OID4VCI spec)
        // Default to mDL if not specified
        const docType =
            credentialConfiguration.config.docType ||
            (credentialConfiguration.config as any).doctype ||
            "org.iso.18013.5.1.mDL";

        // Get the namespace from configuration or derive from docType
        const namespace =
            credentialConfiguration.config.namespace ||
            this.getDefaultNamespace(docType);

        const issuer = new Issuer(docType, mdocContext);

        // Add claims to namespaces
        // Priority: claimsByNamespace > flat claims with namespace
        const claimsByNamespace =
            credentialConfiguration.config.claimsByNamespace;

        if (claimsByNamespace && Object.keys(claimsByNamespace).length > 0) {
            // Multiple namespaces specified
            for (const [ns, nsClaims] of Object.entries(claimsByNamespace)) {
                issuer.addIssuerNamespace(ns, nsClaims);
            }
        } else {
            // Single namespace with flat claims
            issuer.addIssuerNamespace(namespace, claims);
        }

        // Get signing certificate
        const certificate = await this.certService.find({
            tenantId: session.tenantId,
            type: CertUsage.Signing,
            id: credentialConfiguration.certId,
        });

        // Get the private key for signing
        const keyEntity = await this.certService.keyService.getKey(
            session.tenantId,
            certificate.keyId,
        );
        const privateKey = await exportJWK(
            await crypto.subtle.importKey(
                "jwk",
                keyEntity.key,
                { name: "ECDSA", namedCurve: "P-256" },
                true,
                ["sign"],
            ),
        );

        // Get certificate raw data
        const certPem = certificate.crt;
        const x509Cert = new X509Certificate(certPem);

        // Set validity dates
        const signed = new Date();
        const validFrom = new Date(signed);
        const validUntil = new Date(signed);

        // Use lifeTime from config or default to 1 year
        if (credentialConfiguration.lifeTime) {
            validUntil.setSeconds(
                validUntil.getSeconds() + credentialConfiguration.lifeTime,
            );
        } else {
            validUntil.setFullYear(validUntil.getFullYear() + 1);
        }

        // Sign the mDOC
        const issuerSigned = await issuer.sign({
            signingKey: CoseKey.fromJwk(privateKey as Jwk),
            certificate: new Uint8Array(x509Cert.rawData),
            algorithm: SignatureAlgorithm.ES256,
            digestAlgorithm: "SHA-256",
            deviceKeyInfo: { deviceKey: DeviceKey.fromJwk(deviceKey) },
            validityInfo: { signed, validFrom, validUntil },
        });

        this.logger.debug(
            `Issued mDOC credential for docType: ${docType}, tenant: ${session.tenantId}`,
        );

        // Return the encoded credential for OID4VCI
        return issuerSigned.encodedForOid4Vci;
    }

    /**
     * Get the default namespace for a given docType.
     */
    private getDefaultNamespace(docType: string): string {
        // For mDL, the namespace is typically "org.iso.18013.5.1"
        if (docType === "org.iso.18013.5.1.mDL") {
            return "org.iso.18013.5.1";
        }
        // For other docTypes, use the docType as namespace
        return docType;
    }
}
