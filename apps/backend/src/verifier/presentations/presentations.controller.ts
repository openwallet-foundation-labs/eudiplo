import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationConfigUpdateDto } from "./dto/presentation-config-update.dto";
import { PresentationsService } from "./presentations.service";

@ApiTags("Verifier")
@Controller("verifier/config")
export class PresentationManagementController {
    constructor(private readonly presentationsService: PresentationsService) {}

    /**
     * Returns the presentation request configurations.
     * @returns
     */
    @Secured([Role.Presentations, Role.PresentationRequest])
    @Get()
    configuration(@Token() user: TokenPayload) {
        return this.presentationsService.getPresentationConfigs(
            user.entity!.id,
        );
    }

    /**
     * Store a presentation request configuration. If it already exists, it will be updated.
     * @param config
     * @returns
     */
    @Secured([Role.Presentations])
    @Post()
    storePresentationConfig(
        @Body() config: PresentationConfigCreateDto,
        @Token() user: TokenPayload,
    ) {
        return this.presentationsService.storePresentationConfig(
            user.entity!.id,
            config,
        );
    }

    /**
     * Get a presentation request configuration by its ID.
     * @param id
     * @param user
     * @returns
     */
    @Secured([Role.Presentations, Role.PresentationRequest])
    @Get(":id")
    getConfiguration(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.presentationsService.getPresentationConfig(
            id,
            user.entity!.id,
        );
    }

    /**
     * Update a presentation request configuration by its ID.
     * @param id
     * @param config
     * @param user
     * @returns
     */
    @Secured([Role.Presentations])
    @Patch(":id")
    updateConfiguration(
        @Param("id") id: string,
        @Body() config: PresentationConfigUpdateDto,
        @Token() user: TokenPayload,
    ) {
        return this.presentationsService.updatePresentationConfig(
            id,
            user.entity!.id,
            config,
        );
    }

    /**
     * Deletes a presentation request configuration by its ID.
     * @param id
     * @returns
     */
    @Secured([Role.Presentations])
    @Delete(":id")
    deleteConfiguration(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.presentationsService.deletePresentationConfig(
            id,
            user.entity!.id,
        );
    }
}
