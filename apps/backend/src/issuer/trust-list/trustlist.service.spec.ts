import { Test, TestingModule } from "@nestjs/testing";
import { TrustlistService } from "./trustlist.service";

describe("TrustlistService", () => {
    let service: TrustlistService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TrustlistService],
        }).compile();

        service = module.get<TrustlistService>(TrustlistService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
