import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    type HttpMethod,
    Oauth2ResourceServer,
    SupportedAuthenticationScheme,
    authorizationCodeGrantIdentifier,
} from '@openid4vc/oauth2';
import {
    type CredentialResponse,
    type IssuerMetadataResult,
    Openid4vciDraftVersion,
    Openid4vciIssuer,
} from '@openid4vc/openid4vci';
import type { Request } from 'express';
import { CredentialsService } from '../../issuer/credentials/credentials.service';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthorizeService } from '../authorize/authorize.service';
import { getHeadersFromRequest } from './util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SessionService } from '../../session/session.service';
import { v4 } from 'uuid';
import { OfferRequest, OfferResponse } from './dto/offer-request.dto';

@Injectable()
export class Oid4vciService {
    private issuer: Openid4vciIssuer;

    resourceServer: Oauth2ResourceServer;

    constructor(
        private readonly authzService: AuthorizeService,
        private readonly cryptoService: CryptoService,
        public readonly credentialsService: CredentialsService,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
    ) {
        this.issuer = new Openid4vciIssuer({
            //@ts-expect-error: callbacks are not typed yet
            callbacks: this.cryptoService.callbacks,
        });
        this.resourceServer = new Oauth2ResourceServer({
            callbacks: this.cryptoService.callbacks,
        });
    }

    async issuerMetadata(): Promise<IssuerMetadataResult> {
        const credential_issuer = `${this.configService.getOrThrow<string>(
            'PUBLIC_URL',
        )}`;

        const display = JSON.parse(
            readFileSync(
                join(
                    this.configService.getOrThrow<string>('FOLDER'),
                    'display.json',
                ),
                'utf-8',
            ).replace(
                /<PUBLIC_URL>/g,
                this.configService.getOrThrow<string>('PUBLIC_URL'),
            ),
        );

        const credentialIssuer = this.issuer.createCredentialIssuerMetadata({
            credential_issuer,
            credential_configurations_supported:
                await this.credentialsService.getCredentialConfiguration(),
            credential_endpoint: `${credential_issuer}/vci/credential`,
            authorization_servers: [this.authzService.authzMetadata().issuer],
            authorization_server: this.authzService.authzMetadata().issuer,
            notification_endpoint: `${credential_issuer}/vci/notification`,
            batch_credential_issuance: {
                batch_size: 1,
            },
            display,
        });

        return {
            credentialIssuer,
            authorizationServers: [this.authzService.authzMetadata()],
            originalDraftVersion: Openid4vciDraftVersion.Draft14,
        } as const satisfies IssuerMetadataResult;
    }

    async createOffer(body: OfferRequest): Promise<OfferResponse> {
        body.credentialConfigurationIds.forEach((id) => {
            if (
                this.credentialsService.getCredentialConfiguration()[id] ===
                undefined
            ) {
                throw new ConflictException(
                    'Invalid credential configuration ID',
                );
            }
        });
        const issuerMetadata = await this.issuerMetadata();
        const issuer_state = v4();
        return this.issuer
            .createCredentialOffer({
                credentialConfigurationIds: body.credentialConfigurationIds,
                grants: {
                    [authorizationCodeGrantIdentifier]: {
                        issuer_state,
                    },
                },
                issuerMetadata,
            })
            .then(async (offer) => {
                await this.sessionService.create({
                    id: issuer_state,
                    offer: offer.credentialOfferObject,
                    credentialPayload: body,
                });
                return {
                    session: issuer_state,
                    uri: offer.credentialOffer,
                } as OfferResponse;
            });
    }

    async getCredential(req: Request): Promise<CredentialResponse> {
        const issuerMetadata = await this.issuerMetadata();
        const parsedCredentialRequest = this.issuer.parseCredentialRequest({
            issuerMetadata,
            credentialRequest: req.body as Record<string, unknown>,
        });

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            throw new Error('Invalid credential request');
        }

        const headers = getHeadersFromRequest(req);
        const { tokenPayload } =
            await this.resourceServer.verifyResourceRequest({
                authorizationServers: issuerMetadata.authorizationServers,
                request: {
                    url: `https://${req.host}${req.url}`,
                    method: req.method as HttpMethod,
                    headers,
                },
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                ],
            });

        const session = await this.sessionService.get(
            tokenPayload.sub as string,
        );

        const credentials: string[] = [];
        for (const jwt of parsedCredentialRequest.proofs.jwt) {
            const verifiedProof =
                await this.issuer.verifyCredentialRequestJwtProof({
                    //check if this is correct or if the passed nonce is validated.
                    expectedNonce: tokenPayload.nonce as string,
                    issuerMetadata: await this.issuerMetadata(),
                    jwt,
                });
            const cnf = verifiedProof.signer.publicJwk;
            const cred = await this.credentialsService.getCredential(
                parsedCredentialRequest.credentialConfigurationId as string,
                cnf as any,
                session,
            );
            credentials.push(cred);
        }

        return this.issuer.createCredentialResponse({
            credentials,
            credentialRequest: parsedCredentialRequest,
            cNonce: tokenPayload.nonce as string,
            cNonceExpiresInSeconds: 3600,
        });
    }
}
