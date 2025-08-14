import { TestBed } from '@angular/core/testing';

import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JwtService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should decode a valid JWT token', () => {
    // Mock JWT token with basic payload
    const mockToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYWRtaW4iLCJ1c2VyIl19fQ.abc123';

    // Note: This is a mock token for testing purposes only
    const payload = service.decodeToken(mockToken);
    expect(payload).toBeTruthy();
    expect(payload?.sub).toBe('1234567890');
  });

  it('should return null for invalid token', () => {
    const invalidToken = 'invalid.token.here';
    const payload = service.decodeToken(invalidToken);
    expect(payload).toBeNull();
  });

  it('should check realm roles correctly', () => {
    // Create a mock token with admin role
    const mockPayload = {
      realm_access: {
        roles: ['admin', 'user'],
      },
    };
    const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

    expect(service.hasRealmRole(mockToken, 'admin')).toBeTruthy();
    expect(service.hasRealmRole(mockToken, 'nonexistent')).toBeFalsy();
  });

  it('should check client roles correctly', () => {
    const mockPayload = {
      resource_access: {
        'admin-cli': {
          roles: ['admin'],
        },
      },
    };
    const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

    expect(service.hasClientRole(mockToken, 'admin-cli', 'admin')).toBeTruthy();
    expect(service.hasClientRole(mockToken, 'admin-cli', 'nonexistent')).toBeFalsy();
    expect(service.hasClientRole(mockToken, 'other-client', 'admin')).toBeFalsy();
  });
});
