import { Test, TestingModule } from "@nestjs/testing";
import { TrustListController } from "./trustlist.controller";

describe("TrustlistController", () => {
    let controller: TrustListController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrustListController],
        }).compile();

        controller = module.get<TrustListController>(TrustListController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
