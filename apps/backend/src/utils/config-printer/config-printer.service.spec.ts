import { Test, TestingModule } from "@nestjs/testing";
import { ConfigPrinterService } from "./config-printer.service";

describe("ConfigPrinterService", () => {
    let service: ConfigPrinterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ConfigPrinterService],
        }).compile();

        service = module.get<ConfigPrinterService>(ConfigPrinterService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
