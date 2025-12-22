import { Test, TestingModule } from "@nestjs/testing";
import { IssuanceConfigController } from "./issuance-config.controller";

describe("IssuanceConfigController", () => {
    let controller: IssuanceConfigController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IssuanceConfigController],
        }).compile();

        controller = module.get<IssuanceConfigController>(
            IssuanceConfigController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
