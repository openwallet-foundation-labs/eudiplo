import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/**
 * Main application controller
 */
@ApiTags("App")
@Controller()
export class AppController {
    /**
     * Main endpoint providing service info
     * @returns
     */
    @Get()
    main() {
        return {
            service: "EUDIPLO",
            version: process.env.VERSION ?? "main",
            documentation:
                "https://openwallet-foundation-labs.github.io/eudiplo/latest/",
        };
    }
}
