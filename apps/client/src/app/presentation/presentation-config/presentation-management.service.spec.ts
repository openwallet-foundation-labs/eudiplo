import { TestBed } from '@angular/core/testing';

import { PresentationManagementService } from './presentation-management.service';

describe('PresentationManagementService', () => {
  let service: PresentationManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
