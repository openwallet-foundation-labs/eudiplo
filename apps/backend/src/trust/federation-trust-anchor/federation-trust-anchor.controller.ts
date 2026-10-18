import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { AuditLogRequestMeta } from "../../audit-log/audit-log.service.js";
import { AuditMeta } from "../../audit-log/audit-log-context.util.js";
import { Role } from "../../auth/roles/role.enum.js";
import { Secured } from "../../auth/secure.decorator.js";
import { Token, TokenPayload } from "../../auth/token.decorator.js";
import {
    FederationTrustAnchorConflict,
    FederationTrustAnchorNotFound,
} from "./domain/federation-trust-anchor-errors.js";
import {
    CreateFederationTrustAnchorDto,
    UpdateFederationTrustAnchorDto,
} from "./dto/federation-trust-anchor.dto.js";
import { FederationTrustAnchorResponseDto } from "./dto/federation-trust-anchor-response.dto.js";
import { FederationTrustAnchorService } from "./federation-trust-anchor.service.js";

/** Maps the service's errors to their HTTP status. */
function httpError(error: unknown): never {
    if (error instanceof FederationTrustAnchorNotFound) {
        throw new NotFoundException(error.message);
    }
    if (error instanceof FederationTrustAnchorConflict) {
        throw new ConflictException(error.message);
    }
    throw error;
}

/**
 * OpenID Federation trust anchors with pinned keys. Issuance configurations
 * (`federation.trustAnchors`) and presentation configurations (DCQL
 * `openid_federation`) name them by entity ID, so both roles manage them.
 */
@ApiTags("Trust")
@Secured([Role.Issuances, Role.Presentations])
@Controller("federation-trust-anchor")
export class FederationTrustAnchorController {
    constructor(private readonly service: FederationTrustAnchorService) {}

    @Get()
    @ApiOperation({ summary: "List the tenant's federation trust anchors" })
    @ApiResponse({
        status: 200,
        description: "List of federation trust anchors",
        type: [FederationTrustAnchorResponseDto],
    })
    getAll(@Token() user: TokenPayload) {
        return this.service.getAll(user.entity!.id);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a federation trust anchor by ID" })
    @ApiResponse({
        status: 200,
        description: "The federation trust anchor",
        type: FederationTrustAnchorResponseDto,
    })
    @ApiResponse({ status: 404, description: "Trust anchor not found" })
    getById(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.service.getById(user.entity!.id, id).catch(httpError);
    }

    @Post()
    @ApiOperation({ summary: "Register a federation trust anchor" })
    @ApiResponse({
        status: 201,
        description: "Trust anchor registered",
        type: FederationTrustAnchorResponseDto,
    })
    @ApiResponse({
        status: 409,
        description: "The ID or entity ID is already registered",
    })
    @ApiBody({ type: CreateFederationTrustAnchorDto })
    create(
        @Body() dto: CreateFederationTrustAnchorDto,
        @Token() user: TokenPayload,
        @AuditMeta() requestMeta: AuditLogRequestMeta,
    ) {
        return this.service
            .create(user.entity!.id, dto, user, requestMeta)
            .catch(httpError);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a federation trust anchor" })
    @ApiResponse({
        status: 200,
        description: "Trust anchor updated",
        type: FederationTrustAnchorResponseDto,
    })
    @ApiResponse({ status: 404, description: "Trust anchor not found" })
    @ApiResponse({
        status: 409,
        description: "The entity ID is already registered",
    })
    @ApiBody({ type: UpdateFederationTrustAnchorDto })
    update(
        @Param("id") id: string,
        @Body() dto: UpdateFederationTrustAnchorDto,
        @Token() user: TokenPayload,
        @AuditMeta() requestMeta: AuditLogRequestMeta,
    ) {
        return this.service
            .update(user.entity!.id, id, dto, user, requestMeta)
            .catch(httpError);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a federation trust anchor" })
    @ApiResponse({ status: 204, description: "Trust anchor deleted" })
    @ApiResponse({ status: 404, description: "Trust anchor not found" })
    @HttpCode(204)
    delete(
        @Param("id") id: string,
        @Token() user: TokenPayload,
        @AuditMeta() requestMeta: AuditLogRequestMeta,
    ) {
        return this.service
            .delete(user.entity!.id, id, user, requestMeta)
            .catch(httpError);
    }
}
