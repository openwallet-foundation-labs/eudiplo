import { Controller, Get, Header } from '@nestjs/common';
import { StatusListService } from './status-list.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('status-management')
@Controller('status-management')
export class StatusListController {
    constructor(private statusListService: StatusListService) {}

    /**
     * Get the status list
     * @returns
     */
    @Get('status-list')
    @Header('Content-Type', 'application/statuslist+jwt')
    getList() {
        return this.statusListService.getList();
    }
}
