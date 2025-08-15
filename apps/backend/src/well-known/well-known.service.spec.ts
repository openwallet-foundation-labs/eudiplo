import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { WellKnownService } from "./well-known.service";

describe("WellKnownService", () => {
    let service: WellKnownService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WellKnownService],
        }).compile();

        service = module.get<WellKnownService>(WellKnownService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
