import { Test, TestingModule } from '@nestjs/testing';
import { IssuerManagmentController } from './issuer-managment.controller';

describe('IssuerManagmentController', () => {
    let controller: IssuerManagmentController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [IssuerManagmentController],
        }).compile();

        controller = module.get<IssuerManagmentController>(
            IssuerManagmentController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
