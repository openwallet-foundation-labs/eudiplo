import { Test, type TestingModule } from '@nestjs/testing';
import { Oid4vciService } from './oid4vci.service';

describe('Oid4vciService', () => {
  let service: Oid4vciService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Oid4vciService],
    }).compile();

    service = module.get<Oid4vciService>(Oid4vciService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
