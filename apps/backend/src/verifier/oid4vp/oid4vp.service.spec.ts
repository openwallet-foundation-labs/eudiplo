import { Test, TestingModule } from "@nestjs/testing";
import { Oid4vpService } from "./oid4vp.service";

describe("Oid4vpService", () => {
    let service: Oid4vpService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [Oid4vpService],
        }).compile();

        service = module.get<Oid4vpService>(Oid4vpService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
