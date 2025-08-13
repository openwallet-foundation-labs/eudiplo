import { TestBed } from '@angular/core/testing';

import { KeyManagementService } from './key-management.service';

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeyManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
