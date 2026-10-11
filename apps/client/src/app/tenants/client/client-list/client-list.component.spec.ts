import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ClientEntity } from '@eudiplo/sdk-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigOwnershipService } from '../../../config-portability/config-ownership.service';
import { JwtService } from '../../../services/jwt.service';
import { ClientListComponent } from './client-list.component';

describe('ClientListComponent role limits', () => {
  let fixture: ComponentFixture<ClientListComponent>;
  let component: ClientListComponent;

  beforeEach(async () => {
    vi.spyOn(ClientListComponent.prototype, 'loadClients').mockResolvedValue();
    await TestBed.configureTestingModule({
      imports: [ClientListComponent],
      providers: [
        provideRouter([]),
        { provide: JwtService, useValue: { getRoles: () => ['clients:manage', 'issuance:offer'] } },
        { provide: ConfigOwnershipService, useValue: { isManaged: async () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientListComponent);
    component = fixture.componentInstance;
    component.clients = [
      { clientId: 'offer', roles: ['issuance:offer'] },
      { clientId: 'registrar', roles: ['registrar:manage'] },
    ] as ClientEntity[];
    fixture.detectChanges();
  });

  function actions(row: number): HTMLButtonElement[] {
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    return [...rows[row].querySelectorAll('td:last-child button')] as HTMLButtonElement[];
  }

  it('enables edit, rotate and delete for a client whose roles the caller holds', () => {
    // View, edit, rotate secret, delete
    expect(actions(0).map((button) => button.disabled)).toEqual([false, false, false, false]);
  });

  it('disables edit, rotate and delete for a client with a role the caller lacks', () => {
    expect(actions(1).map((button) => button.disabled)).toEqual([false, true, true, true]);
  });

  it('sends nothing when a disabled action is clicked', () => {
    const rotate = vi.spyOn(component, 'rotateSecret');
    const remove = vi.spyOn(component, 'deleteClient');
    actions(1)[2].click();
    actions(1)[3].click();
    expect(rotate).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
