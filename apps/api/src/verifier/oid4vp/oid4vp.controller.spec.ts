import { Test, TestingModule } from '@nestjs/testing';
import { Oid4vpController } from './oid4vp.controller';

describe('Oid4vpController', () => {
  let controller: Oid4vpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Oid4vpController],
    }).compile();

    controller = module.get<Oid4vpController>(Oid4vpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
