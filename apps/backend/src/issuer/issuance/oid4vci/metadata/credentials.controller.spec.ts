import { Test, TestingModule } from "@nestjs/testing";
import { CredentialConfigController } from "../../../configuration/credentials/credential-config.controller";

describe("CredentialConfigController", () => {
    let controller: CredentialConfigController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CredentialConfigController],
        }).compile();

        controller = module.get<CredentialConfigController>(
            CredentialConfigController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
