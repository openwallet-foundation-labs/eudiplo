import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
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
