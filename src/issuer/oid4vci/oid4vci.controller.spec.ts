import { Test, type TestingModule } from '@nestjs/testing';
import { Oid4vciController } from './oid4vci.controller';

describe('Oid4vciController', () => {
  let controller: Oid4vciController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Oid4vciController],
    }).compile();

    controller = module.get<Oid4vciController>(Oid4vciController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
