import { Controller, Get, Header, Param } from "@nestjs/common";
import {
    ApiExcludeController,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";
import { StatusListAggregationDto } from "./dto/status-list-aggregation.dto";
import { StatusListImportDto } from "./dto/status-list-import.dto";
import { StatusListService } from "./status-list.service";

@ApiExtraModels(StatusListImportDto)
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
@ApiTags("Issuer")
@Controller(":tenantId/status-management")
export class StatusListController {
    constructor(private readonly statusListService: StatusListService) {}

    /**
     * Get the JWT for a specific status list.
     * @param tenantId The tenant ID.
     * @param listId The status list ID.
     * @returns The status list JWT.
     */
    @Get("status-list/:listId")
    @Header("Content-Type", "application/statuslist+jwt")
    getList(
        @Param("tenantId") tenantId: string,
        @Param("listId") listId: string,
    ) {
        return this.statusListService.getListJwt(tenantId, listId);
    }

    /**
     * Get all status list URIs for a tenant (Status List Aggregation).
     * This endpoint returns a list of all status list token URIs,
     * allowing relying parties to pre-fetch all status lists for offline validation.
     * See RFC draft-ietf-oauth-status-list Section 9.3.
     * @param tenantId The tenant ID.
     * @returns The status list aggregation response.
     */
    @Get("status-list-aggregation")
    @Header("Content-Type", "application/json")
    @ApiOperation({
        summary: "Get all status list URIs",
        description:
            "Returns a list of all status list token URIs for the tenant. " +
            "This allows relying parties to pre-fetch all status lists for offline validation. " +
            "See RFC draft-ietf-oauth-status-list Section 9.",
    })
    @ApiOkResponse({
        description: "List of status list URIs",
        type: StatusListAggregationDto,
    })
    async getStatusListAggregation(
        @Param("tenantId") tenantId: string,
    ): Promise<StatusListAggregationDto> {
        const statusLists =
            await this.statusListService.getStatusListUris(tenantId);
        return { status_lists: statusLists };
    }
}
