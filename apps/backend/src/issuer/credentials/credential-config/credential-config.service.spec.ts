import { Test, TestingModule } from "@nestjs/testing";
import { CredentialConfigService } from "./credential-config.service";

describe("CredentialConfigService", () => {
    let service: CredentialConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CredentialConfigService],
        }).compile();

        service = module.get<CredentialConfigService>(CredentialConfigService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
