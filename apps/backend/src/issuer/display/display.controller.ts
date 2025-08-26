import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/auth.guard";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { DisplayService } from "./display.service";
import { DisplayCreateDto } from "./dto/display-create.dto";

/**
 * Display Controller
 */
@UseGuards(JwtAuthGuard)
@ApiSecurity("oauth2")
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
        return this.displayService.get(user.sub);
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
        return this.displayService.create(user.sub, displayData);
    }
}
