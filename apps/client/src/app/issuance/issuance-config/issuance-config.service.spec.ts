import { TestBed } from '@angular/core/testing';

import { IssuanceConfigService } from './issuance-config.service';

describe('IssuanceConfigService', () => {
  let service: IssuanceConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IssuanceConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
