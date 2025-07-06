import { Test, TestingModule } from '@nestjs/testing';
import { PresentationsController } from './presentations.controller';

describe('PresentationsController', () => {
  let controller: PresentationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresentationsController],
    }).compile();

    controller = module.get<PresentationsController>(PresentationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
