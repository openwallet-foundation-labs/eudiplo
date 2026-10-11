import { X509Certificate } from "node:crypto";
import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CertService } from "../crypto/key/cert/cert.service.js";
import { KeyChainType } from "../crypto/key/dto/key-chain-create.dto.js";
import { KeyChainService } from "../crypto/key/key-chain.service.js";
import { KeyUsageType } from "../crypto/key/types/key-usage-type.js";
import type { Client } from "./generated/client/index.js";
import {
    accessCertificateControllerAccessCertificates,
    accessCertificateControllerDelete,
    accessCertificateControllerRegister,
} from "./generated/index.js";
import { RegistrarAuthService } from "./registrar-auth.service.js";
import type {
    CreateAccessCertificate,
    CreateAccessKeyChain,
} from "./schemas/registrar.schema.js";

/** An access certificate stored in EUDIPLO. */
export interface AccessCertificateResult {
    /** The certificate ID at the registrar */
    id: string;
    /** ID of the key chain that holds the certificate */
    certId: string;
    /** The certificate in PEM format */
    crt: string;
}

/**
 * Handles creation of access certificates via the registrar API and their
 * subsequent storage in the local certificate store.
 */
@Injectable()
export class AccessCertificateService {
    private readonly logger = new Logger(AccessCertificateService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly authService: RegistrarAuthService,
        private readonly certService: CertService,
        private readonly keyChainService: KeyChainService,
    ) {}

    /**
     * Create an access certificate for a key.
     * Fetches the relying party from the registrar, registers the certificate,
     * and stores it in EUDIPLO's local certificate store.
     *
     * @param tenantId - The tenant ID
     * @param dto - The access certificate creation data
     * @returns The registrar's certificate ID, the ID of the key chain that
     * now holds the certificate, and the certificate PEM
     */
    async createAccessCertificate(
        tenantId: string,
        dto: CreateAccessCertificate,
    ): Promise<AccessCertificateResult> {
        const client = await this.authService.getClient(tenantId);
        const relyingPartyId =
            await this.authService.getRelyingPartyId(tenantId);
        return this.enroll(tenantId, client, relyingPartyId, dto.keyId);
    }

    /**
     * Create a standalone access key chain and enroll it at the registrar in
     * one request. When the enrollment fails, the key chain is deleted again,
     * so the tenant is not left with a self-signed access key chain. The
     * registrar configuration and relying party are checked before the key
     * chain is created.
     *
     * @param tenantId - The tenant ID
     * @param dto - Description and KMS provider of the new key chain
     * @returns As {@link createAccessCertificate}; `certId` is the new key chain
     */
    async createAccessKeyChain(
        tenantId: string,
        dto: CreateAccessKeyChain,
    ): Promise<AccessCertificateResult> {
        const client = await this.authService.getClient(tenantId);
        const relyingPartyId =
            await this.authService.getRelyingPartyId(tenantId);

        const keyId = await this.keyChainService.create(tenantId, {
            usageType: KeyUsageType.Access,
            type: KeyChainType.Standalone,
            description: dto.description,
            kmsProvider: dto.kmsProvider,
        });

        try {
            return await this.enroll(tenantId, client, relyingPartyId, keyId);
        } catch (error) {
            const deleted = await this.keyChainService
                .delete(tenantId, keyId)
                .then(
                    () => true,
                    (err: unknown) => {
                        this.logger.error(
                            `[${tenantId}] Failed to delete access key chain ${keyId} after its enrollment failed: ${String(err)}`,
                        );
                        return false;
                    },
                );
            if (deleted) throw error;
            // Not the enrollment's status: the caller must learn that a key
            // chain without registrar certificate is left.
            const reason =
                error instanceof HttpException
                    ? error.message
                    : "Failed to create access certificate";
            throw new InternalServerErrorException(
                `${reason}. The new access key chain ${keyId} could not be deleted; delete it.`,
            );
        }
    }

    /**
     * Request the registrar certificate for a key chain and store it there.
     *
     * When the registrar answers with an error or no answer arrives, it may
     * still have issued the certificate, for example when the response was
     * lost. The registrar's list of active certificates of the relying party
     * is then searched for one with the key's public key; a match is stored
     * as if the request had succeeded, so the certificate is not orphaned at
     * the registrar. Without a match, an error answer of the registrar is a
     * 400 and a failed request is passed on. When EUDIPLO cannot store a
     * certificate issued by this request, it revokes it at the registrar; a
     * found certificate may have been issued earlier and is not revoked.
     */
    private async enroll(
        tenantId: string,
        client: Client,
        relyingPartyId: string,
        keyId: string,
    ): Promise<AccessCertificateResult> {
        const csr = await this.keyChainService.createCertificateSigningRequest(
            tenantId,
            keyId,
        );

        const issued:
            | { certificate: { id: string; crt: string } }
            | { error: unknown } = await accessCertificateControllerRegister({
            client,
            body: {
                displayName: `Access certificate for ${keyId}`,
                csr,
                rpId: relyingPartyId,
            },
        }).then(
            (res) =>
                res.error || !res.data
                    ? { error: res.error }
                    : { certificate: res.data },
            (error: unknown) => ({ error }),
        );

        let certificate: { id: string; crt: string };
        const issuedNow = "certificate" in issued;
        if (issuedNow) {
            certificate = issued.certificate;
        } else {
            const recovered = await this.findIssuedCertificate(
                tenantId,
                client,
                relyingPartyId,
                keyId,
            );
            if (!recovered) {
                this.logger.error(
                    { error: issued.error },
                    `[${tenantId}] Failed to create access certificate`,
                );
                if (issued.error instanceof Error) throw issued.error;
                throw new BadRequestException(
                    "Failed to create access certificate",
                );
            }
            this.logger.warn(
                `[${tenantId}] The registrar request for key chain ${keyId} failed, but the registrar lists access certificate ${recovered.id} for its key; storing that certificate`,
            );
            certificate = recovered;
        }

        const { id, crt } = certificate;
        let certId: string;
        try {
            certId = await this.certService.addCertificate(tenantId, {
                crt: [crt],
                keyId,
                defaultDescription: `Access certificate from registrar (ID: ${id})`,
            });
        } catch (error) {
            if (issuedNow) await this.revoke(tenantId, client, id);
            throw error;
        }

        this.logger.log(
            `[${tenantId}] Created access certificate with ID: ${id}, stored as ${certId}`,
        );

        return { id, certId, crt };
    }

    /**
     * The active access certificate the registrar lists for the relying party
     * with the public key of the key chain, if any. The certificate the key
     * chain already holds does not count: a refused re-enrollment must not
     * look like a success. Undefined when the registrar cannot be queried.
     */
    private async findIssuedCertificate(
        tenantId: string,
        client: Client,
        relyingPartyId: string,
        keyId: string,
    ): Promise<{ id: string; crt: string } | undefined> {
        try {
            const keyChain = await this.keyChainService.getEntity(
                tenantId,
                keyId,
            );
            const current = new X509Certificate(keyChain.activeCertificate);
            const publicKey = current.publicKey.export({
                type: "spki",
                format: "der",
            });
            const res = await accessCertificateControllerAccessCertificates({
                client,
                query: { rp: relyingPartyId },
            });
            const match = res.data?.find((entry) => {
                if (entry.revoked != null) return false;
                // One unreadable entry must not hide a matching one.
                let listed: X509Certificate;
                try {
                    listed = new X509Certificate(entry.certificate);
                } catch {
                    return false;
                }
                return (
                    listed.fingerprint256 !== current.fingerprint256 &&
                    listed.publicKey
                        .export({ type: "spki", format: "der" })
                        .equals(publicKey)
                );
            });
            return match && { id: match.id, crt: match.certificate };
        } catch (error) {
            this.logger.warn(
                `[${tenantId}] Could not check the registrar for an access certificate of key chain ${keyId}: ${String(error)}`,
            );
            return undefined;
        }
    }

    /** Best-effort revocation of a certificate EUDIPLO could not store. */
    private async revoke(
        tenantId: string,
        client: Client,
        id: string,
    ): Promise<void> {
        const res = await accessCertificateControllerDelete({
            client,
            path: { id },
        }).catch((error: unknown) => ({ error }));
        if (res.error) {
            this.logger.error(
                { error: res.error },
                `[${tenantId}] Could not store access certificate ${id} and could not revoke it at the registrar; revoke it there`,
            );
        } else {
            this.logger.warn(
                `[${tenantId}] Could not store access certificate ${id}; revoked it at the registrar`,
            );
        }
    }

    /**
     * Find the registrar id of the access certificate held by an access key
     * chain, so a registration certificate can be linked to the access
     * certificate that signs requests. The link is optional at the registrar:
     * when the key chain is missing, its certificate was not issued by the
     * registrar or the registrar cannot be queried, no id is returned.
     *
     * @param tenantId - The tenant ID
     * @param client - Authenticated registrar client
     * @param relyingPartyId - The relying party at the registrar
     * @param accessKeyChainId - Access key chain to match; the tenant's default access key chain when omitted
     * @returns The registrar id of the matching active access certificate, if any
     */
    async findRegistrarAccessCertificateId(
        tenantId: string,
        client: Client,
        relyingPartyId: string,
        accessKeyChainId?: string,
    ): Promise<string | undefined> {
        const cert = await this.certService
            .find({
                tenantId,
                type: KeyUsageType.Access,
                keyId: accessKeyChainId,
                skipValidation: true,
            })
            .catch(() => undefined);
        if (!cert) {
            this.logger.warn(
                `[${tenantId}] No access key chain found; the registration certificate is not linked to an access certificate`,
            );
            return undefined;
        }
        const fingerprint = new X509Certificate(cert.crt[0]).fingerprint256;

        const res = await accessCertificateControllerAccessCertificates({
            client,
            query: { rp: relyingPartyId },
        });
        if (res.error) {
            this.logger.warn(
                { error: res.error },
                `[${tenantId}] Failed to fetch access certificates; the registration certificate is not linked to an access certificate`,
            );
            return undefined;
        }

        const match = res.data?.find(
            (entry) =>
                entry.revoked == null &&
                new X509Certificate(entry.certificate).fingerprint256 ===
                    fingerprint,
        );
        if (!match) {
            this.logger.warn(
                `[${tenantId}] The certificate of access key chain '${cert.keyId}' is not an active access certificate at the registrar; the registration certificate is not linked to an access certificate`,
            );
        }
        return match?.id;
    }
}
