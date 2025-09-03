import { Body, Controller, Get, Post } from "@nestjs/common";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { DisplayService } from "./display.service";
import { DisplayCreateDto } from "./dto/display-create.dto";

/**
 * Display Controller
 */
@Secured([Role.Issuances])
@Controller("display")
export class DisplayController {
    /**
     * Display Controller
     * @param displayService
     */
    constructor(private readonly displayService: DisplayService) {}

    /**
     * Get display information for a user
     * @param user The user token payload
     * @returns The display information
     */
    @Get()
    getDisplay(@Token() user: TokenPayload) {
        return this.displayService.get(user.entity!.id);
    }

    /**
     * Create a new display for a user
     * @param user The user token payload
     * @param displayData The display data to create
     * @returns The created display information
     */
    @Post()
    createDisplay(
        @Token() user: TokenPayload,
        @Body() displayData: DisplayCreateDto,
    ) {
        return this.displayService.create(user.entity!.id, displayData);
    }
}
