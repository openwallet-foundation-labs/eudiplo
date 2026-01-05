import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiExcludeController, ApiExtraModels, ApiTags } from "@nestjs/swagger";
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
}
