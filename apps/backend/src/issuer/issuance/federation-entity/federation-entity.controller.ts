import {
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    NotFoundException,
    Param,
    Res,
} from "@nestjs/common";
import { ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { NotFoundError } from "../../../shared/domain/not-found-error.js";
import { FederationEntityUnavailableError } from "../../../trust/ports/federation-entity-provider.js";
import {
    InvalidFederationEntityIdError,
    PublishEntityConfiguration,
} from "./application/publish-entity-configuration.js";

const ENTITY_STATEMENT_MEDIA_TYPE = "application/entity-statement+jwt";

/**
 * Publishes the OpenID Federation entity configuration of a tenant at
 * `{entityId}/.well-known/openid-federation`, for the entity id
 * `{PUBLIC_URL}/issuers/{tenantId}`. Errors are answered as OpenID
 * Federation error responses (Sections 9.2 and 8.9).
 */
@ApiTags("OpenID Federation")
@Controller("issuers/:tenantId/.well-known")
export class FederationEntityController {
    private readonly logger = new Logger(FederationEntityController.name);
    private readonly logged = new WeakSet<InvalidFederationEntityIdError>();

    constructor(
        @Inject(PublishEntityConfiguration)
        private readonly publish: PublishEntityConfiguration,
    ) {}

    @ApiOperation({
        summary: "Get the OpenID Federation entity configuration",
        description:
            "Returns the signed entity configuration of the tenant's federation entity. 404 (not_found) when the tenant takes no part in a federation or has no federation key chain, 503 (temporarily_unavailable) when the trust engine does not deliver it.",
    })
    @ApiProduces(ENTITY_STATEMENT_MEDIA_TYPE)
    @Get("openid-federation")
    async entityConfiguration(
        @Param("tenantId") tenantId: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<string> {
        try {
            const jwt = await this.publish.execute(tenantId);
            res.status(HttpStatus.OK);
            res.setHeader("Content-Type", ENTITY_STATEMENT_MEDIA_TYPE);
            return jwt;
        } catch (error) {
            const [status, body] = federationError(error);
            // The response stays generic; the operator finds the reason
            // here. The use case answers the same error for ten seconds, so
            // it is logged once per attempt, not per request.
            if (
                error instanceof InvalidFederationEntityIdError &&
                !this.logged.has(error)
            ) {
                this.logged.add(error);
                this.logger.warn(error.message);
            }
            if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
                this.logger.error(
                    `Entity configuration of tenant ${tenantId} failed: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
            res.status(status);
            res.setHeader("Content-Type", "application/json");
            return JSON.stringify(body);
        }
    }
}

/** OpenID Federation 1.0 Section 8.9 error response for `error`. */
function federationError(
    error: unknown,
): [number, { error: string; error_description: string }] {
    if (error instanceof NotFoundError || error instanceof NotFoundException) {
        return [
            HttpStatus.NOT_FOUND,
            {
                error: "not_found",
                error_description:
                    "This tenant publishes no OpenID Federation entity configuration",
            },
        ];
    }
    if (error instanceof FederationEntityUnavailableError) {
        return [
            HttpStatus.SERVICE_UNAVAILABLE,
            {
                error: "temporarily_unavailable",
                error_description:
                    "The entity configuration is temporarily unavailable",
            },
        ];
    }
    return [
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
            error: "server_error",
            error_description: "The entity configuration could not be created",
        },
    ];
}
