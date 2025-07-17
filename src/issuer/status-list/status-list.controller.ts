import { Controller, Get, Header, Param } from '@nestjs/common';
import { StatusListService } from './status-list.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Status management')
@Controller(':tenantId/status-management')
export class StatusListController {
    constructor(private statusListService: StatusListService) {}

    /**
     * Get the status list
     * @returns
     */
    @Get('status-list')
    @Header('Content-Type', 'application/statuslist+jwt')
    getList(@Param('tenantId') tenantId: string) {
        return this.statusListService.getList(tenantId);
    }
}
