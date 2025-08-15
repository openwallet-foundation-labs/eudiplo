import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { KeyController } from "./key.controller";

describe("KeyController", () => {
    let controller: KeyController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [KeyController],
        }).compile();

        controller = module.get<KeyController>(KeyController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
