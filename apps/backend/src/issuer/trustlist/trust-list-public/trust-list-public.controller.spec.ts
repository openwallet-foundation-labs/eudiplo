import { Test, TestingModule } from "@nestjs/testing";
import { TrustListPublicController } from "./trust-list-public.controller";

describe("TrustListPublicController", () => {
    let controller: TrustListPublicController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrustListPublicController],
        }).compile();

        controller = module.get<TrustListPublicController>(
            TrustListPublicController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
