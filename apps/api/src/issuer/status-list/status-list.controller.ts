import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { StatusListService } from './status-list.service';

@ApiExcludeController(process.env.SWAGGER_ALL !== 'true')
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
