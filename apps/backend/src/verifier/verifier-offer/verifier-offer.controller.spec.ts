import { Test, TestingModule } from "@nestjs/testing";
import { VerifierOfferController } from "./verifier-offer.controller";

describe("VerifyOfferController", () => {
    let controller: VerifierOfferController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VerifierOfferController],
        }).compile();

        controller = module.get<VerifierOfferController>(
            VerifierOfferController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
