import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "../auth/roles/role.enum";
import { Secured } from "../auth/secure.decorator";
import { Token, TokenPayload } from "../auth/token.decorator";
import {
    DeprecateSchemaMetadataDto,
    SchemaMetadataResponseDto,
    SubmitSchemaMetadataDto,
    UpdateSchemaMetadataDto,
} from "./dto/schema-metadata.dto";
import { SchemaMetadataService } from "./schema-metadata.service";

/**
 * Controller for managing TS11 schema metadata at the configured registrar /
 * catalog provider. Operations are scoped to the calling tenant; auth is
 * delegated to the registrar via the tenant's registrar credentials.
 *
 * The signing endpoint that produces a JWS lives on the issuer side
 * (`POST /issuer/credentials/schema-metadata/sign`) because it depends on
 * the tenant's key chain.
 *
 * @experimental The TS11 specification (EUDI Catalogue of Attestations) is
 * not yet finalized.
 */
@ApiTags("Schema Metadata")
@Secured([Role.Registrar])
@Controller("schema-metadata")
export class SchemaMetadataController {
    constructor(
        private readonly schemaMetadataService: SchemaMetadataService,
    ) {}

    @Get()
    @ApiOperation({ summary: "List schema metadata" })
    @ApiResponse({ status: 200, type: [SchemaMetadataResponseDto] })
    findAll(
        @Token() token: TokenPayload,
        @Query("attestationId") attestationId?: string,
        @Query("version") version?: string,
    ): Promise<SchemaMetadataResponseDto[]> {
        return this.schemaMetadataService.findAll(token.entity!.id, {
            attestationId,
            version,
        });
    }

    @Post()
    @ApiOperation({ summary: "Submit signed schema metadata" })
    @ApiBody({ type: SubmitSchemaMetadataDto })
    @ApiResponse({ status: 201, type: SchemaMetadataResponseDto })
    submit(
        @Token() token: TokenPayload,
        @Body() body: SubmitSchemaMetadataDto,
    ): Promise<SchemaMetadataResponseDto> {
        return this.schemaMetadataService.submitSignedSchemaMetadata(
            token.entity!.id,
            body.signedJwt,
            body.reservationToken,
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get schema metadata by ID" })
    @ApiResponse({ status: 200, type: SchemaMetadataResponseDto })
    findOne(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<SchemaMetadataResponseDto> {
        return this.schemaMetadataService.findOne(token.entity!.id, id);
    }

    @Patch(":id/versions/:version")
    @ApiOperation({ summary: "Update schema metadata attributes" })
    @ApiBody({ type: UpdateSchemaMetadataDto })
    @ApiResponse({ status: 200, type: SchemaMetadataResponseDto })
    update(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
        @Body() body: UpdateSchemaMetadataDto,
    ): Promise<SchemaMetadataResponseDto> {
        return this.schemaMetadataService.updateMetadata(
            token.entity!.id,
            id,
            version,
            body,
        );
    }

    @Delete(":id/versions/:version")
    @ApiOperation({ summary: "Delete schema metadata" })
    @ApiResponse({ status: 200, description: "Deleted" })
    remove(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
    ): Promise<void> {
        return this.schemaMetadataService.remove(token.entity!.id, id, version);
    }

    @Get(":id/latest")
    @ApiOperation({ summary: "Get latest version of schema metadata by ID" })
    @ApiResponse({ status: 200, type: SchemaMetadataResponseDto })
    getLatest(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<SchemaMetadataResponseDto> {
        return this.schemaMetadataService.getLatest(token.entity!.id, id);
    }

    @Get(":id/versions")
    @ApiOperation({ summary: "List all versions of a schema metadata entry" })
    @ApiResponse({ status: 200, type: [SchemaMetadataResponseDto] })
    getVersions(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<SchemaMetadataResponseDto[]> {
        return this.schemaMetadataService.getVersions(token.entity!.id, id);
    }

    @Get(":id/versions/:version/jwt")
    @ApiOperation({ summary: "Get signed schema metadata JWT" })
    @ApiResponse({
        status: 200,
        description: "Compact-serialization JWS string",
        schema: { type: "string" },
    })
    getJwt(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
    ): Promise<string> {
        return this.schemaMetadataService.getSignedJwt(
            token.entity!.id,
            id,
            version,
        );
    }

    @Get(":id/versions/:version/export")
    @ApiOperation({ summary: "Export schema metadata in catalog format" })
    @ApiResponse({
        status: 200,
        description: "Registrar-defined catalog document",
        schema: { type: "object", additionalProperties: true },
    })
    export(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
    ): Promise<unknown> {
        return this.schemaMetadataService.exportCatalogFormat(
            token.entity!.id,
            id,
            version,
        );
    }

    @Get(":id/versions/:version/schemas/:format")
    @ApiOperation({ summary: "Get schema content for a specific format" })
    @ApiResponse({
        status: 200,
        description: "JSON Schema document for the requested format",
        schema: { type: "object", additionalProperties: true },
    })
    getSchema(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
        @Param("format") format: string,
    ): Promise<unknown> {
        return this.schemaMetadataService.getSchemaByFormat(
            token.entity!.id,
            id,
            version,
            format,
        );
    }

    @Patch(":id/versions/:version/deprecation")
    @ApiOperation({ summary: "Deprecate a schema metadata version" })
    @ApiBody({ type: DeprecateSchemaMetadataDto })
    @ApiResponse({ status: 200, type: SchemaMetadataResponseDto })
    deprecateVersion(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Param("version") version: string,
        @Body() body: DeprecateSchemaMetadataDto,
    ): Promise<SchemaMetadataResponseDto> {
        return this.schemaMetadataService.deprecateVersion(
            token.entity!.id,
            id,
            version,
            body,
        );
    }
}
