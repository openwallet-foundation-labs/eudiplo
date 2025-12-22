import { Test, TestingModule } from "@nestjs/testing";
import { CredentialOfferController } from "./credential-offer.controller";

describe("IssuerManagmentController", () => {
    let controller: CredentialOfferController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CredentialOfferController],
        }).compile();

        controller = module.get<CredentialOfferController>(
            CredentialOfferController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
