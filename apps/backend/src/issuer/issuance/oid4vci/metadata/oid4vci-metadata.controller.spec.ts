import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { Oid4vciMetadataController } from "./oid4vci-metadata.controller";

describe("Oid4vciMetadataController", () => {
    let controller: Oid4vciMetadataController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [Oid4vciMetadataController],
        }).compile();

        controller = module.get<Oid4vciMetadataController>(
            Oid4vciMetadataController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
