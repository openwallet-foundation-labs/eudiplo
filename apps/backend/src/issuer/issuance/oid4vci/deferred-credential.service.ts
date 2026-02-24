import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
    type HttpMethod,
    type Jwk,
    Oauth2ResourceServer,
    SupportedAuthenticationScheme,
} from "@openid4vc/oauth2";
import {
    type CredentialResponse,
    DeferredCredentialResponse,
    type IssuerMetadataResult,
    Openid4vciIssuer,
} from "@openid4vc/openid4vci";
import type { Request } from "express";
import { decodeJwt } from "jose";
import { LessThan, Repository } from "typeorm";
import { v4 } from "uuid";
import { CryptoService } from "../../../crypto/crypto.service";
import { Session } from "../../../session/entities/session.entity";
import { SessionService } from "../../../session/session.service";
import { SessionLoggerService } from "../../../shared/utils/logger/session-logger.service";
import { SessionLogContext } from "../../../shared/utils/logger/session-logger-context";
import { CredentialsService } from "../../configuration/credentials/credentials.service";
import { IssuanceService } from "../../configuration/issuance/issuance.service";
import { DeferredCredentialRequestDto } from "./dto/deferred-credential-request.dto";
import {
    DeferredTransactionEntity,
    DeferredTransactionStatus,
} from "./entities/deferred-transaction.entity";
import { NonceEntity } from "./entities/nonces.entity";
import {
    CredentialRequestException,
    DeferredCredentialException,
} from "./exceptions";
import { getHeadersFromRequest } from "./util";

/**
 * Parameters for creating a deferred credential transaction.
 */
export interface CreateDeferredTransactionParams {
    /** The parsed credential request */
    parsedCredentialRequest: {
        proofs: { jwt: string[] };
        credentialConfigurationId: string;
    };
    /** The session */
    session: Session;
    /** The tenant ID */
    tenantId: string;
    /** The interval for wallet polling (in seconds) */
    interval?: number;
    /** The issuer metadata */
    issuerMetadata: IssuerMetadataResult;
}

/**
 * Service for handling deferred credential issuance operations.
 * Manages the lifecycle of deferred transactions including creation,
 * retrieval, completion, and failure.
 */
@Injectable()
export class DeferredCredentialService {
    constructor(
        private readonly cryptoService: CryptoService,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly sessionLogger: SessionLoggerService,
        private readonly issuanceService: IssuanceService,
        private readonly credentialsService: CredentialsService,
        @InjectRepository(NonceEntity)
        private readonly nonceRepository: Repository<NonceEntity>,
        @InjectRepository(DeferredTransactionEntity)
        private readonly deferredTransactionRepository: Repository<DeferredTransactionEntity>,
    ) {}

    /**
     * Get the OID4VCI issuer instance for a specific tenant.
     */
    private getIssuer(tenantId: string): Openid4vciIssuer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Openid4vciIssuer({ callbacks });
    }

    /**
     * Get the OID4VCI resource server instance for a specific tenant.
     */
    private getResourceServer(tenantId: string): Oauth2ResourceServer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Oauth2ResourceServer({ callbacks });
    }

    /**
     * Create a deferred credential transaction.
     * Called when the webhook indicates that credential issuance should be deferred.
     *
     * @param params The parameters for creating the deferred transaction
     * @param logContext The logging context
     * @returns A deferred credential response with transaction_id and interval
     */
    async createDeferredTransaction(
        params: CreateDeferredTransactionParams,
        logContext: SessionLogContext,
    ): Promise<DeferredCredentialResponse> {
        const {
            parsedCredentialRequest,
            session,
            tenantId,
            interval = 5,
            issuerMetadata,
        } = params;

        const issuer = this.getIssuer(tenantId);

        // Verify the first proof to get the holder's public key
        const jwt = parsedCredentialRequest.proofs.jwt[0];
        const payload = decodeJwt(jwt);
        const expectedNonce = payload.nonce! as string;

        // Delete the nonce to prevent reuse
        const nonceResult = await this.nonceRepository.delete({
            nonce: expectedNonce,
            tenantId,
        });
        if (nonceResult.affected === 0) {
            throw new CredentialRequestException(
                "invalid_nonce",
                "The nonce in the key proof is invalid or has already been used",
            );
        }

        const verifiedProof = await issuer.verifyCredentialRequestJwtProof({
            expectedNonce,
            issuerMetadata,
            jwt,
        });

        const transactionId = v4();

        // Calculate expiration (default 24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create deferred transaction record
        const deferredTransaction = this.deferredTransactionRepository.create({
            transactionId,
            tenantId,
            sessionId: session.id,
            credentialConfigurationId:
                parsedCredentialRequest.credentialConfigurationId,
            holderCnf: verifiedProof.signer.publicJwk as Record<
                string,
                unknown
            >,
            status: DeferredTransactionStatus.Pending,
            interval,
            expiresAt,
        });

        await this.deferredTransactionRepository.save(deferredTransaction);

        this.sessionLogger.logSession(
            logContext,
            "Deferred credential issuance initiated",
            {
                transactionId,
                credentialConfigurationId:
                    parsedCredentialRequest.credentialConfigurationId,
                interval,
                expiresAt: expiresAt.toISOString(),
            },
        );

        return {
            transaction_id: transactionId,
            interval,
        };
    }

    /**
     * Handle deferred credential request.
     * Called when wallet polls with transaction_id.
     *
     * @param req The request
     * @param body The deferred credential request DTO
     * @param tenantId The tenant ID
     * @param issuerMetadata The issuer metadata
     * @returns Credential response or throws issuance_pending error
     */
    async getDeferredCredential(
        req: Request,
        body: DeferredCredentialRequestDto,
        tenantId: string,
        issuerMetadata: IssuerMetadataResult,
    ): Promise<CredentialResponse> {
        const resourceServer = this.getResourceServer(tenantId);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        const headers = getHeadersFromRequest(req);

        const allowedAuthenticationSchemes = [
            SupportedAuthenticationScheme.DPoP,
        ];

        if (!issuanceConfig.dPopRequired) {
            allowedAuthenticationSchemes.push(
                SupportedAuthenticationScheme.Bearer,
            );
        }

        // Verify the access token
        await resourceServer.verifyResourceRequest({
            authorizationServers: issuerMetadata.authorizationServers,
            request: {
                url: `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`,
                method: req.method as HttpMethod,
                headers,
            },
            resourceServer: issuerMetadata.credentialIssuer.credential_issuer,
            allowedAuthenticationSchemes,
        });

        // Find the deferred transaction
        const deferredTransaction =
            await this.deferredTransactionRepository.findOneBy({
                transactionId: body.transaction_id,
                tenantId,
            });

        if (!deferredTransaction) {
            throw new DeferredCredentialException(
                "invalid_transaction_id",
                "The transaction_id is invalid or has expired",
            );
        }

        // Check if transaction has expired
        if (new Date() > deferredTransaction.expiresAt) {
            await this.deferredTransactionRepository.update(
                { transactionId: body.transaction_id },
                { status: DeferredTransactionStatus.Expired },
            );
            throw new DeferredCredentialException(
                "invalid_transaction_id",
                "The transaction has expired",
            );
        }

        // Create logging context
        const logContext: SessionLogContext = {
            sessionId: deferredTransaction.sessionId,
            tenantId,
            flowType: "OID4VCI",
            stage: "deferred_credential",
        };

        // Check the status of the deferred transaction
        switch (deferredTransaction.status) {
            case DeferredTransactionStatus.Pending:
                this.sessionLogger.logSession(
                    logContext,
                    "Deferred credential still pending",
                    {
                        transactionId: body.transaction_id,
                        interval: deferredTransaction.interval,
                    },
                );
                throw new DeferredCredentialException(
                    "issuance_pending",
                    "The credential issuance is still pending",
                    deferredTransaction.interval,
                );

            case DeferredTransactionStatus.Failed:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    deferredTransaction.errorMessage ||
                        "The credential issuance has failed",
                );

            case DeferredTransactionStatus.Expired:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "The transaction has expired",
                );

            case DeferredTransactionStatus.Retrieved:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "The credential has already been retrieved",
                );

            case DeferredTransactionStatus.Ready:
                if (!deferredTransaction.credential) {
                    throw new DeferredCredentialException(
                        "invalid_transaction_id",
                        "Credential is marked as ready but not available",
                    );
                }

                // Mark as retrieved
                await this.deferredTransactionRepository.update(
                    { transactionId: body.transaction_id },
                    { status: DeferredTransactionStatus.Retrieved },
                );

                this.sessionLogger.logSession(
                    logContext,
                    "Deferred credential retrieved",
                    {
                        transactionId: body.transaction_id,
                        credentialConfigurationId:
                            deferredTransaction.credentialConfigurationId,
                    },
                );

                return {
                    credential: deferredTransaction.credential,
                } as CredentialResponse;

            default:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "Unknown transaction status",
                );
        }
    }

    /**
     * Mark a deferred transaction as ready with the issued credential.
     * This method is called when the external system completes processing.
     *
     * @param tenantId The tenant ID
     * @param transactionId The transaction ID
     * @param claims The claims to include in the credential
     * @returns The updated deferred transaction or null if not found
     */
    async completeDeferredTransaction(
        tenantId: string,
        transactionId: string,
        claims: Record<string, unknown>,
    ): Promise<DeferredTransactionEntity | null> {
        const transaction = await this.deferredTransactionRepository.findOneBy({
            transactionId,
            tenantId,
            status: DeferredTransactionStatus.Pending,
        });

        if (!transaction) {
            return null;
        }

        const session = await this.sessionService.get(transaction.sessionId);
        if (!session) {
            throw new ConflictException(
                `Session ${transaction.sessionId} not found for deferred transaction ${transactionId}`,
            );
        }

        const credential = await this.credentialsService.getCredential(
            transaction.credentialConfigurationId,
            transaction.holderCnf as Jwk,
            session,
            claims,
        );

        await this.deferredTransactionRepository.update(
            { transactionId, tenantId },
            {
                status: DeferredTransactionStatus.Ready,
                credential,
            },
        );

        transaction.status = DeferredTransactionStatus.Ready;
        transaction.credential = credential;

        return transaction;
    }

    /**
     * Mark a deferred transaction as failed.
     *
     * @param tenantId The tenant ID
     * @param transactionId The transaction ID
     * @param errorMessage Optional error message
     * @returns The updated deferred transaction or null if not found
     */
    async failDeferredTransaction(
        tenantId: string,
        transactionId: string,
        errorMessage?: string,
    ): Promise<DeferredTransactionEntity | null> {
        const transaction = await this.deferredTransactionRepository.findOneBy({
            transactionId,
            tenantId,
        });

        if (!transaction) {
            return null;
        }

        await this.deferredTransactionRepository.update(
            { transactionId, tenantId },
            {
                status: DeferredTransactionStatus.Failed,
                errorMessage: errorMessage ?? "Transaction marked as failed",
            },
        );

        transaction.status = DeferredTransactionStatus.Failed;
        transaction.errorMessage =
            errorMessage ?? "Transaction marked as failed";

        return transaction;
    }

    /**
     * Cleanup expired deferred transactions.
     * Runs hourly via cron job.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredDeferredTransactions(): Promise<void> {
        await this.deferredTransactionRepository.delete({
            expiresAt: LessThan(new Date()),
        });
    }
}
