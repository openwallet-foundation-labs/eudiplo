import { TestBed } from '@angular/core/testing';

import {
  IssuanceConfigService,
  statusCheckModeLabel,
  statusCheckModeOverride,
} from './issuance-config.service';

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

describe('wallet attestation status check mode helpers', () => {
  it('labels unset as best effort', () => {
    expect(statusCheckModeLabel(null)).toBe('Best effort');
    expect(statusCheckModeLabel(undefined)).toBe('Best effort');
    expect(statusCheckModeLabel('best_effort')).toBe('Best effort');
    expect(statusCheckModeLabel('strict')).toBe('Strict');
    expect(statusCheckModeLabel('disabled')).toBe('Disabled');
  });

  it('sends inherit as unset', () => {
    expect(statusCheckModeOverride('inherit')).toBeUndefined();
    expect(statusCheckModeOverride(null)).toBeUndefined();
    expect(statusCheckModeOverride('disabled')).toBe('disabled');
  });
});
