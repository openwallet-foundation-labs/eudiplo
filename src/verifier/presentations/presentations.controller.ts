import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { PresentationsService } from './presentations.service';
import { VPRequest } from './dto/vp-request.dto';
import { ApiKeyGuard } from '../../auth/api-key-guard';

@UseGuards(ApiKeyGuard)
@ApiSecurity('apiKey')
@Controller('presentation-management')
export class PresentationManagementController {
    constructor(private readonly presentationsService: PresentationsService) {}

    /**
     * Returns the presentation request configurations.
     * @returns
     */
    @Get()
    configuration() {
        return this.presentationsService.getPresentations();
    }

    /**
     * Store a presentation request configuration. If it already exists, it will be updated.
     * @param vpRequest
     * @returns
     */
    @Post()
    storePresentationRequest(@Body() vpRequest: VPRequest) {
        return this.presentationsService.storePresentationRequest(vpRequest);
    }

    /**
     * Deletes a presentation request configuration by its ID.
     * @param id
     * @returns
     */
    @Delete(':id')
    deleteConfiguration(@Param('id') id: string) {
        return this.presentationsService.deletePresentationRequest(id);
    }
}
