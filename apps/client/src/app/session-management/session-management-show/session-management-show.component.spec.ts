import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { Session } from '@eudiplo/sdk-core';
import { JwtService } from '../../services/jwt.service';
import { CredentialStatusCardComponent } from '../credential-status/credential-status-card.component';

import { SessionManagementShowComponent } from './session-management-show.component';

describe('SessionManagementShowComponent', () => {
  let component: SessionManagementShowComponent;
  let fixture: ComponentFixture<SessionManagementShowComponent>;
  let roles: string[];

  const issuance = {
    id: 'issuance-1',
    status: 'active',
    consumed: false,
    credentialPayload: { credentialConfigurationIds: ['pid'] },
  } as unknown as Session;
  const presentation = {
    id: 'presentation-1',
    status: 'active',
    consumed: false,
    requestId: 'age-check',
  } as unknown as Session;

  beforeEach(async () => {
    roles = [];
    await TestBed.configureTestingModule({
      imports: [SessionManagementShowComponent],
      providers: [
        provideRouter([]),
        {
          provide: JwtService,
          useValue: {
            hasRole: (role: string | string[]) => [role].flat().some((r) => roles.includes(r)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.stopPolling());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows sessions:read the credential status but no cancel, recreate or status change', () => {
    roles = ['sessions:read'];
    component.session = issuance;

    expect(component.canReadCredentialStatus()).toBe(true);
    expect(component.canChangeCredentialStatus()).toBe(false);
    expect(component.canCancel()).toBe(false);
    expect(component.canRecreateOffer()).toBe(false);
    expect(component.canSeeOffer()).toBe(false);
  });

  it('cancels and recreates only the sessions of the caller side', () => {
    roles = ['issuance:offer', 'sessions:read'];

    component.session = issuance;
    expect(component.canCancel()).toBe(true);
    expect(component.canRecreateOffer()).toBe(true);

    component.session = presentation;
    expect(component.canCancel()).toBe(false);
    expect(component.canRecreateOffer()).toBe(false);
    expect(component.canSeeOffer()).toBe(false);
    expect(component.canReadCredentialStatus()).toBe(false);
  });

  it('counts the manage roles toward a side, like the backend', () => {
    roles = ['presentation:request', 'issuance:manage'];
    component.session = issuance;
    expect(component.canSeeOffer()).toBe(true);
    expect(component.canCancel()).toBe(true);
    // Recreating opens the offer page, which needs issuance:offer.
    expect(component.canRecreateOffer()).toBe(false);

    // issuance:manage counts only together with a role that cancels sessions.
    roles = ['sessions:read', 'issuance:manage'];
    expect(component.canSeeOffer()).toBe(false);
    expect(component.canCancel()).toBe(false);
  });

  it.each([
    [['issuance:manage'], true],
    [['issuance:offer'], false],
  ])('passes %j on to the credential status card as canChange: %s', (granted, allowed) => {
    roles = granted;
    component.session = {
      ...issuance,
      status: 'completed',
      createdAt: '2026-10-11T10:00:00.000Z',
      updatedAt: '2026-10-11T10:00:00.000Z',
      notifications: [],
    } as unknown as Session;
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(CredentialStatusCardComponent));
    expect(card.componentInstance.canChange).toBe(allowed);
  });

  it.each([
    [['issuance:offer'], false],
    [['issuance:manage'], true],
    [['credentials:status', 'sessions:read'], true],
  ])('lets %j change credential status: %s', (granted, allowed) => {
    roles = granted;
    component.session = issuance;

    expect(component.canReadCredentialStatus()).toBe(true);
    expect(component.canChangeCredentialStatus()).toBe(allowed);
  });
});
