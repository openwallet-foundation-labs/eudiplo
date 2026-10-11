import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '../../services/jwt.service';
import { SchemaService } from '../schema.service';
import { SchemaListComponent } from './schema-list.component';

describe('SchemaListComponent', () => {
  let listMine: ReturnType<typeof vi.fn>;

  async function render(roles = ['registrar:manage', 'issuance:manage']) {
    TestBed.configureTestingModule({
      imports: [SchemaListComponent],
      providers: [
        provideRouter([]),
        { provide: SchemaService, useValue: { listMine } },
        { provide: JwtService, useValue: { hasRole: (role: string) => roles.includes(role) } },
      ],
    });
    const fixture = TestBed.createComponent(SchemaListComponent);
    const loadItems = vi.spyOn(fixture.componentInstance, 'loadItems');
    fixture.detectChanges();
    await loadItems.mock.results[0].value;
    fixture.detectChanges();
    return fixture;
  }

  function createButton(fixture: { nativeElement: HTMLElement }): HTMLElement {
    return fixture.nativeElement.querySelector('[aria-label="Create schema"]') as HTMLElement;
  }

  function text(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.textContent ?? '';
  }

  beforeEach(() => {
    listMine = vi.fn().mockResolvedValue([]);
  });

  it('offers Create to users with issuance:manage', async () => {
    const fixture = await render();

    const create = createButton(fixture);
    expect(create.getAttribute('aria-disabled')).toBeNull();
    expect(create.hasAttribute('disabled')).toBe(false);
    expect(text(fixture)).toContain('No schemas published');
    expect(text(fixture)).toContain('Create Schema');
  });

  it('disables Create without issuance:manage and names the role', async () => {
    const fixture = await render(['registrar:manage']);

    const create = createButton(fixture);
    expect(create.getAttribute('aria-disabled')).toBe('true');
    expect(text(fixture)).toContain('Creating a schema needs the issuance:manage role.');
    expect(text(fixture)).not.toContain('Create Schema');
    // The tooltip stays reachable by focus and is the button's description.
    await vi.waitFor(() => {
      const description = document.getElementById(create.getAttribute('aria-describedby') ?? '');
      expect(description?.textContent).toBe('Creating a schema needs the issuance:manage role');
    });
  });

  it('shows why the schemas could not be loaded instead of an empty list', async () => {
    listMine.mockRejectedValueOnce({
      statusCode: 400,
      message: 'Registrar is not configured for this tenant',
    });

    const fixture = await render();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      'Failed to load schemas: Registrar is not configured for this tenant'
    );
    expect(text(fixture)).not.toContain('No schemas published');
    expect(text(fixture)).not.toContain('0 schema entries');

    (alert?.querySelector('button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(fixture.componentInstance.loadError).toBe(''));
    expect(listMine).toHaveBeenCalledTimes(2);
  });

  it('lists the versions of an entry newest first', async () => {
    listMine.mockResolvedValue(
      ['1.0.0', '1.1.0', '1.1.0-rc.1', '1.10.0'].map((version) => ({
        id: 'schema-1',
        version,
        issuer: 'Acme',
        updatedAt: '2026-10-01T00:00:00Z',
      }))
    );

    const fixture = await render();

    expect(fixture.componentInstance.groupedItems[0].versions).toEqual([
      '1.10.0',
      '1.1.0',
      '1.1.0-rc.1',
      '1.0.0',
    ]);
  });
});
