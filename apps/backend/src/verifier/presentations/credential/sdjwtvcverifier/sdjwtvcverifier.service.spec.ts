import { Test, TestingModule } from "@nestjs/testing";
import { SdjwtvcverifierService } from "./sdjwtvcverifier.service";

describe("SdjwtvcverifierService", () => {
    let service: SdjwtvcverifierService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SdjwtvcverifierService],
        }).compile();

        service = module.get<SdjwtvcverifierService>(SdjwtvcverifierService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
