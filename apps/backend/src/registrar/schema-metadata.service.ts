import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { DeprecateSchemaMetadataDto } from "./dto/schema-metadata.dto";
import {
    type ReservationResponseDto,
    type SchemaMetadata,
    schemaMetadataControllerExport,
    schemaMetadataControllerFindAll,
    schemaMetadataControllerFindOne,
    schemaMetadataControllerGetLatestVersionInfo,
    schemaMetadataControllerGetSchema,
    schemaMetadataControllerGetSignedJwt,
    schemaMetadataControllerListVersions,
    schemaMetadataControllerRemove,
    schemaMetadataControllerReserveSchemaId,
    schemaMetadataControllerSetVersionDeprecation,
    schemaMetadataControllerSubmitSchemaMetadata,
    schemaMetadataControllerUpdateMetadata,
    type UpdateSchemaMetadataDto,
} from "./generated";
import { RegistrarAuthService } from "./registrar-auth.service";

type SchemaMetadataFilters = {
    attestationId?: string;
    version?: string;
};

@Injectable()
export class SchemaMetadataService {
    private readonly logger = new Logger(SchemaMetadataService.name);

    constructor(private readonly authService: RegistrarAuthService) {}

    async reserveSchemaId(
        tenantId: string,
        nameHint?: string,
    ): Promise<ReservationResponseDto> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerReserveSchemaId({
            client,
            body: nameHint ? { nameHint } : {},
        });

        console.log(res.data);

        if (res.error) {
            this.throwUpstreamError(tenantId, "reserve schema id", res.error);
        }

        return res.data!;
    }

    async findAll(
        tenantId: string,
        filters: SchemaMetadataFilters,
    ): Promise<SchemaMetadata[]> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerFindAll({
            client,
            query: {
                ...(filters.attestationId ? { id: filters.attestationId } : {}),
                ...(filters.version ? { version: filters.version } : {}),
            },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "list schema metadata",
                res.error,
            );
        }

        return res.data ?? [];
    }

    async submitSignedSchemaMetadata(
        tenantId: string,
        signedJwt: string,
        reservationToken?: string,
    ): Promise<SchemaMetadata> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerSubmitSchemaMetadata({
            client,
            body: signedJwt as unknown as never,
            // The default JSON body serializer would JSON.stringify the JWS,
            // wrapping it in quotes and breaking the registrar's protected
            // header parsing. Disable serialization so the compact JWS is
            // sent verbatim with the SDK's `Content-Type: application/jwt`.
            bodySerializer: null,
            headers: reservationToken
                ? { "X-Reservation-Token": reservationToken }
                : undefined,
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "submit schema metadata",
                res.error,
            );
        }

        return res.data!;
    }

    async findOne(tenantId: string, id: string): Promise<SchemaMetadata> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerFindOne({
            client,
            path: { id },
        });

        if (res.error) {
            this.throwUpstreamError(tenantId, "get schema metadata", res.error);
        }

        return res.data!;
    }

    async updateMetadata(
        tenantId: string,
        id: string,
        version: string,
        dto: UpdateSchemaMetadataDto,
    ): Promise<SchemaMetadata> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerUpdateMetadata({
            client,
            path: { id, version },
            body: dto,
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "update schema metadata",
                res.error,
            );
        }

        return res.data!;
    }

    async remove(tenantId: string, id: string, version: string): Promise<void> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerRemove({
            client,
            path: { id, version },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "delete schema metadata",
                res.error,
            );
        }
    }

    async getSignedJwt(
        tenantId: string,
        id: string,
        version: string,
    ): Promise<string> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerGetSignedJwt({
            client,
            path: { id, version },
            parseAs: "text",
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "get signed schema metadata jwt",
                res.error,
            );
        }

        return res.data as string;
    }

    async exportCatalogFormat(
        tenantId: string,
        id: string,
        version: string,
    ): Promise<unknown> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerExport({
            client,
            path: { id, version },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "export schema metadata",
                res.error,
            );
        }

        return res.data;
    }

    async getSchemaByFormat(
        tenantId: string,
        id: string,
        version: string,
        format: string,
    ): Promise<unknown> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerGetSchema({
            client,
            path: { id, version, format },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "get schema metadata schema",
                res.error,
            );
        }

        return res.data;
    }

    async getLatest(tenantId: string, id: string): Promise<SchemaMetadata> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerGetLatestVersionInfo({
            client,
            path: { id },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "get latest schema metadata",
                res.error,
            );
        }

        return res.data as SchemaMetadata;
    }

    async getVersions(tenantId: string, id: string): Promise<SchemaMetadata[]> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerListVersions({
            client,
            path: { id },
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "list schema metadata versions",
                res.error,
            );
        }

        return (res.data ?? []) as SchemaMetadata[];
    }

    async deprecateVersion(
        tenantId: string,
        id: string,
        version: string,
        dto: DeprecateSchemaMetadataDto,
    ): Promise<SchemaMetadata> {
        const client = await this.authService.getClient(tenantId);
        const res = await schemaMetadataControllerSetVersionDeprecation({
            client,
            path: { id, version },
            body: dto,
        });

        if (res.error) {
            this.throwUpstreamError(
                tenantId,
                "deprecate schema metadata version",
                res.error,
            );
        }

        return res.data!;
    }

    private throwUpstreamError(
        tenantId: string,
        action: string,
        error: unknown,
    ): never {
        const statusCode = Number(
            (error as any)?.status ?? (error as any)?.statusCode,
        );
        const message =
            (error as any)?.error?.message ??
            (error as any)?.message ??
            (error as any)?.error ??
            "Unknown registrar error";

        this.logger.error(
            { tenantId, action, statusCode, error },
            `Failed to ${action}`,
        );

        if (statusCode === 404) {
            throw new NotFoundException(message);
        }

        if (statusCode === 403) {
            throw new ForbiddenException(message);
        }

        if (statusCode === 400 || statusCode === 401 || statusCode === 409) {
            throw new BadRequestException(message);
        }

        throw new InternalServerErrorException(message);
    }
}
