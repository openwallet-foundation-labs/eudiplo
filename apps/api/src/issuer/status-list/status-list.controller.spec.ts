import { Test, TestingModule } from '@nestjs/testing';
import { StatusListController } from './status-list.controller';

describe('StatusListController', () => {
  let controller: StatusListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusListController],
    }).compile();

    controller = module.get<StatusListController>(StatusListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
