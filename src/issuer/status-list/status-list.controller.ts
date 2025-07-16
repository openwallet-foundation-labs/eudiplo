import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { StatusListService } from './status-list.service';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { StatusUpdateDto } from './dto/status-update.dto';
import { JwtAuthGuard } from '../../auth/auth.guard';

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

    /**
     * Update the status of the credentials of a specific session.
     * @param value
     * @returns
     */
    @UseGuards(JwtAuthGuard)
    @ApiSecurity('bearer')
    @Post()
    revokeAll(@Body() value: StatusUpdateDto) {
        return this.statusListService.updateStatus(value);
    }
}
