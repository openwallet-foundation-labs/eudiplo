import { Test, TestingModule } from "@nestjs/testing";
import { PresentationsService } from "./presentations.service";

describe("CredentialsService", () => {
    let service: PresentationsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PresentationsService],
        }).compile();

        service = module.get<PresentationsService>(PresentationsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
