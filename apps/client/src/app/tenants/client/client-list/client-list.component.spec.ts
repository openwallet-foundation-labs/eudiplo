import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { client, type ClientEntity } from '@eudiplo/sdk-core';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ConfigOwnershipService } from '../../../config-portability/config-ownership.service';
import { ApiService } from '../../../core';
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
        { provide: ConfigOwnershipService, useValue: { get: async () => undefined } },
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

describe('ClientListComponent delete', () => {
  let fixture: ComponentFixture<ClientListComponent>;
  let requests: string[];
  let confirm: Mock<(message?: string) => boolean>;
  let logout: Mock<() => void>;
  let snackBar: { open: Mock };
  /** Error body the backend answers DELETE with, or none for a 204. */
  let deleteFailure: { statusCode: number; message: string } | undefined;

  beforeEach(async () => {
    requests = [];
    deleteFailure = undefined;
    confirm = vi.fn<(message?: string) => boolean>(() => true);
    logout = vi.fn();
    snackBar = { open: vi.fn() };
    vi.stubGlobal('confirm', confirm);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(ClientListComponent.prototype, 'loadClients').mockResolvedValue();
    client.setConfig({
      fetch: vi.fn<typeof fetch>(async (input) => {
        const request = input as Request;
        requests.push(`${request.method} ${new URL(request.url).pathname}`);
        if (!deleteFailure) return new Response(null, { status: 204 });
        return new Response(JSON.stringify(deleteFailure), {
          status: deleteFailure.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    await TestBed.configureTestingModule({
      imports: [ClientListComponent],
      providers: [
        provideRouter([]),
        { provide: JwtService, useValue: { getRoles: () => ['clients:manage', 'issuance:offer'] } },
        { provide: ConfigOwnershipService, useValue: { get: async () => undefined } },
        { provide: ApiService, useValue: { getClientId: () => 'offer', logout } },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientListComponent);
    fixture.componentInstance.clients = [
      { clientId: 'offer', roles: ['issuance:offer'] },
      { clientId: 'other', roles: ['issuance:offer'] },
    ] as ClientEntity[];
    fixture.detectChanges();
    // Let the ownership lookups settle, so the buttons no longer hold clicks back.
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeNull();
    });
  });

  afterEach(() => {
    client.setConfig({ fetch: () => new Promise<Response>(() => undefined) });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function deleteButton(row: number): HTMLButtonElement {
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    return rows[row].querySelector('td:last-child button[aria-label^="Delete Client"]');
  }

  it('warns and signs out when the caller deletes the client they are signed in with', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const reload = vi.mocked(fixture.componentInstance.loadClients);
    reload.mockClear();

    deleteButton(0).click();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/login']));
    expect(confirm.mock.lastCall?.[0]).toContain('You are signed in with this client.');
    expect(requests).toContain('DELETE /api/client/offer');
    // Signed out first, or the login page would send the still signed-in caller back into the app.
    expect(logout.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps the caller signed in and the list as it is when the delete fails', async () => {
    deleteFailure = { statusCode: 403, message: 'Cannot manage client offer' };
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const reload = vi.mocked(fixture.componentInstance.loadClients);
    reload.mockClear();

    deleteButton(0).click();

    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith(
        'Failed to delete client: Cannot manage client offer',
        'Close',
        { duration: 5000 }
      )
    );
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });

  it('reloads the list after deleting another client', async () => {
    const reload = vi.mocked(fixture.componentInstance.loadClients);
    reload.mockClear();

    deleteButton(1).click();

    await vi.waitFor(() =>
      expect(snackBar.open).toHaveBeenCalledWith('Client deleted successfully', 'Close', {
        duration: 3000,
      })
    );
    expect(confirm.mock.lastCall?.[0]).not.toContain('You are signed in');
    expect(requests).toContain('DELETE /api/client/other');
    expect(reload).toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});
