import { Test, TestingModule } from '@nestjs/testing';
import { IssuerManagementController } from './issuer-management.controller';

describe('IssuerManagmentController', () => {
  let controller: IssuerManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssuerManagementController],
    }).compile();

    controller = module.get<IssuerManagementController>(
      IssuerManagementController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
