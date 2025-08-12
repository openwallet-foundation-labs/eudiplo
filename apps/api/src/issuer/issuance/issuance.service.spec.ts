import { Test, TestingModule } from '@nestjs/testing';
import { IssuanceService } from './issuance.service';

describe('IssuanceService', () => {
  let service: IssuanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IssuanceService],
    }).compile();

    service = module.get<IssuanceService>(IssuanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
