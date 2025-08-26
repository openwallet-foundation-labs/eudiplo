import { Test, TestingModule } from "@nestjs/testing";
import { TenantController } from "./tenant.controller";

describe("ClientController", () => {
    let controller: TenantController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TenantController],
        }).compile();

        controller = module.get<TenantController>(TenantController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
