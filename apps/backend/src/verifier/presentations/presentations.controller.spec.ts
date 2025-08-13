import { Test, TestingModule } from '@nestjs/testing';
import { PresentationManagementController } from './presentations.controller';

describe('PresentationsController', () => {
    let controller: PresentationManagementController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PresentationManagementController],
        }).compile();

        controller = module.get<PresentationManagementController>(
            PresentationManagementController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
