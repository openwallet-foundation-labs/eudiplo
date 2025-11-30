import { Test, TestingModule } from "@nestjs/testing";
import { ConfigImportService } from "./config-import.service";

describe("ConfigImportService", () => {
    let service: ConfigImportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ConfigImportService],
        }).compile();

        service = module.get<ConfigImportService>(ConfigImportService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
