import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorizeController } from './authorize.controller';

describe('AuthorizeController', () => {
  let controller: AuthorizeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizeController],
    }).compile();

    controller = module.get<AuthorizeController>(AuthorizeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
