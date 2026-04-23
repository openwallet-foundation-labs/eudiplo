import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Header,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
    Res,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { IssuanceService } from "../../../configuration/issuance/issuance.service";
import {
    ChainedAsService,
    extractDpopJkt,
} from "../chained-as/chained-as.service";
import {
    ChainedAsParRequestDto,
    ChainedAsTokenRequestDto,
} from "../chained-as/dto/chained-as.dto";
import { AuthorizeService } from "./authorize.service";
import { AuthorizeQueries } from "./dto/authorize-request.dto";
import { ParResponseDto } from "./dto/par-response.dto";

/**
 * Controller for the OpenID4VCI authorization endpoints.
 * This controller handles the authorization requests, token requests.
 */
@ApiTags("OID4VCI")
@Controller("issuers/:tenantId/authorize")
export class AuthorizeController {
    constructor(
        private readonly authorizeService: AuthorizeService,
        private readonly issuanceService: IssuanceService,
        private readonly chainedAsService: ChainedAsService,
    ) {}

    /**
     * Endpoint to handle the Authorization Request.
     * @param queries
     * @param res
     */
    @Get()
    async authorize(
        @Query() queries: AuthorizeQueries,
        @Res() res: Response,
        @Param("tenantId") tenantId: string,
    ) {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        if (issuanceConfig.chainedAs?.enabled) {
            if (!queries.client_id || !queries.request_uri) {
                throw new BadRequestException(
                    "client_id and request_uri are required",
                );
            }

            const redirectUrl = await this.chainedAsService.handleAuthorize(
                tenantId,
                queries.client_id,
                queries.request_uri,
            );
            res.redirect(redirectUrl);
            return;
        }

        const redirectUrl =
            await this.authorizeService.sendAuthorizationResponse(
                queries,
                tenantId,
            );
        res.redirect(redirectUrl);
    }

    /**
     * Endpoint to handle the Pushed Authorization Request (PAR).
     * @param body
     * @returns
     */
    @ApiBody({
        description: "Pushed Authorization Request",
        type: AuthorizeQueries,
    })
    @ApiConsumes("application/x-www-form-urlencoded")
    @Post("par")
    @HttpCode(HttpStatus.CREATED)
    async par(
        @Param("tenantId") tenantId: string,
        @Body() body: AuthorizeQueries,
        @Headers("dpop") dpopJwt?: string,
        @Headers("oauth-client-attestation") clientAttestationJwt?: string,
        @Headers("oauth-client-attestation-pop")
        clientAttestationPopJwt?: string,
    ): Promise<ParResponseDto> {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        const clientAttestation =
            clientAttestationJwt && clientAttestationPopJwt
                ? { clientAttestationJwt, clientAttestationPopJwt }
                : undefined;

        if (issuanceConfig.chainedAs?.enabled) {
            const dpopJkt = dpopJwt ? extractDpopJkt(dpopJwt) : undefined;
            let parsedAuthorizationDetails:
                | Record<string, unknown>[]
                | undefined;
            if (body.authorization_details) {
                try {
                    parsedAuthorizationDetails = JSON.parse(
                        body.authorization_details,
                    ) as Record<string, unknown>[];
                } catch {
                    throw new BadRequestException(
                        "authorization_details must be valid JSON",
                    );
                }
            }
            const chainedParRequest: ChainedAsParRequestDto = {
                ...(body as any),
                authorization_details: parsedAuthorizationDetails,
            };

            return this.chainedAsService.handlePar(
                tenantId,
                chainedParRequest,
                dpopJkt,
                clientAttestation,
            );
        }

        return this.authorizeService.handlePar(
            tenantId,
            body,
            clientAttestation,
        );
    }

    /**
     * Endpoint to validate the token request.
     * This endpoint is used to exchange the authorization code for an access token.
     * @param body
     * @param req
     * @returns
     */
    @Post("token")
    @HttpCode(HttpStatus.OK)
    token(
        @Body() body: any,
        @Req() req: Request,
        @Headers("dpop") dpopJwt: string | undefined,
        @Param("tenantId") tenantId: string,
    ): Promise<any> {
        return this.issuanceService
            .getIssuanceConfiguration(tenantId)
            .then((issuanceConfig) => {
                if (
                    issuanceConfig.chainedAs?.enabled &&
                    body?.grant_type === "authorization_code"
                ) {
                    return this.chainedAsService.handleToken(
                        tenantId,
                        body as ChainedAsTokenRequestDto,
                        dpopJwt,
                    );
                }

                return this.authorizeService.validateTokenRequest(
                    body,
                    req,
                    tenantId,
                );
            });
    }

    /**
     * Callback endpoint for upstream OIDC provider used in chained auth-code mode.
     */
    @Get("callback")
    async callback(
        @Param("tenantId") tenantId: string,
        @Res() res: Response,
        @Query("code") code?: string,
        @Query("state") state?: string,
        @Query("error") error?: string,
        @Query("error_description") errorDescription?: string,
    ): Promise<void> {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        if (!issuanceConfig.chainedAs?.enabled) {
            throw new BadRequestException(
                "Upstream callback is only available when chained AS is enabled",
            );
        }

        const redirectUrl = await this.chainedAsService.handleUpstreamCallback(
            tenantId,
            code || "",
            state || "",
            error,
            errorDescription,
        );
        res.redirect(redirectUrl);
    }

    /**
     * Client Attestation Challenge Endpoint.
     * Returns a nonce for inclusion in the Client Attestation PoP JWT.
     * @see OAuth2-ATCA07-8
     */
    @Post("challenge")
    @HttpCode(HttpStatus.OK)
    @Header("Cache-Control", "no-store")
    challenge(
        @Param("tenantId") tenantId: string,
    ): Promise<{ attestation_challenge: string }> {
        return this.authorizeService.challengeRequest(tenantId);
    }
}
