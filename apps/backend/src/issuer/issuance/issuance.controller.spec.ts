import { Test, TestingModule } from '@nestjs/testing';
import { IssuanceController } from './issuance.controller';

describe('IssuanceController', () => {
    let controller: IssuanceController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IssuanceController],
        }).compile();

        controller = module.get<IssuanceController>(IssuanceController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
