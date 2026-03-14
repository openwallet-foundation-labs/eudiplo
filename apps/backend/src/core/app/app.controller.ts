import { Controller, Get, UseGuards } from "@nestjs/common";
import {
    ApiOperation,
    ApiResponse,
    ApiSecurity,
    ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/auth.guard";

/**
 * Main application controller
 */
@ApiTags("App")
@Controller()
export class AppController {
    /**
     * Main endpoint providing service info
     */
    @Get()
    main() {
        return {
            service: "EUDIPLO",
            documentation:
                "https://openwallet-foundation-labs.github.io/eudiplo/latest/",
        };
    }

    /**
     * Returns the running service version. Requires authentication.
     */
    @Get("version")
    @UseGuards(JwtAuthGuard)
    @ApiSecurity("oauth2")
    @ApiOperation({ summary: "Get service version" })
    @ApiResponse({ status: 200, description: "Service version info" })
    getVersion() {
        return {
            version: process.env.VERSION ?? "main",
        };
    }
}
