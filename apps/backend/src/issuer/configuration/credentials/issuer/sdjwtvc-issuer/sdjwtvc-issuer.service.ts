import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Jwk } from "@openid4vc/oauth2";
import { digest, generateSalt } from "@sd-jwt/crypto-nodejs";
import { JWTwithStatusListPayload } from "@sd-jwt/jwt-status-list";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { CertService } from "../../../../../crypto/key/cert/cert.service";
import { CryptoImplementationService } from "../../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { CertUsage } from "../../../../../crypto/key/entities/cert-usage.entity";
import { Session } from "../../../../../session/entities/session.entity";
import { StatusListService } from "../../../../lifecycle/status/status-list.service";
import { CredentialConfig } from "../../entities/credential.entity";

export interface SdJwtVcIssueOptions {
    credentialConfiguration: CredentialConfig;
    holderCnf: Jwk;
    session: Session;
    claims: Record<string, any>;
}

/**
 * Service for issuing SD-JWT VC credentials.
 */
@Injectable()
export class SdjwtvcIssuerService {
    constructor(
        private readonly certService: CertService,
        private readonly configService: ConfigService,
        private readonly statusListService: StatusListService,
        private readonly cryptoImplementationService: CryptoImplementationService,
    ) {}

    /**
     * Issues an SD-JWT VC credential.
     * @param options - The issuance options
     * @returns The issued SD-JWT VC credential string
     */
    async issue(options: SdJwtVcIssueOptions): Promise<string> {
        const { credentialConfiguration, holderCnf, session, claims } = options;

        const certificate = await this.certService.find({
            tenantId: session.tenantId,
            type: CertUsage.Signing,
            id: credentialConfiguration.certId,
        });

        const sdjwt = new SDJwtVcInstance({
            signer: await this.certService.keyService.signer(
                session.tenantId,
                certificate.keyId,
            ),
            signAlg: this.cryptoImplementationService.getAlg(),
            hasher: digest,
            hashAlg: "sha-256",
            saltGenerator: generateSalt,
            loadTypeMetadataFormat: true,
        });

        // If status management is enabled, create a status entry
        let status: JWTwithStatusListPayload | undefined;
        if (credentialConfiguration.statusManagement) {
            status = await this.statusListService.createEntry(
                session,
                credentialConfiguration.id,
            );
        }

        const iat = Math.round(Date.now() / 1000);
        // Set expiration time if lifeTime is defined
        let exp: number | undefined;
        if (credentialConfiguration.lifeTime) {
            exp = iat + credentialConfiguration.lifeTime;
        }

        // If key binding is enabled, include the JWK in the cnf
        let cnf: { jwk: Jwk } | undefined;
        if (credentialConfiguration.keyBinding) {
            cnf = {
                jwk: holderCnf,
            };
        }

        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        const disclosureFrame = credentialConfiguration.disclosureFrame ?? {};

        const vct =
            typeof credentialConfiguration.vct === "string"
                ? credentialConfiguration.vct
                : `${host}/${session.tenantId}/credentials-metadata/vct/${credentialConfiguration.id}`;

        return sdjwt.issue(
            {
                iat,
                exp,
                vct,
                cnf,
                ...claims,
                ...status,
            },
            disclosureFrame,
            {
                header: {
                    x5c: this.certService.getCertChain(certificate),
                    alg: this.cryptoImplementationService.getAlg(),
                },
            },
        );
    }
}
