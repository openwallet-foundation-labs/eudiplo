import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SchemaService } from '../schema.service';
import { SchemaListComponent } from './schema-list.component';

describe('SchemaListComponent', () => {
  async function render(listMine: () => Promise<unknown>) {
    await TestBed.configureTestingModule({
      imports: [SchemaListComponent],
      providers: [provideRouter([]), { provide: SchemaService, useValue: { listMine } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SchemaListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows why loading failed instead of an empty list', async () => {
    // The SDK throws the parsed error body of the backend.
    const element = await render(
      vi.fn().mockRejectedValue({
        statusCode: 400,
        message: 'Failed to authenticate with registrar: the OIDC provider answered with HTTP 401',
      })
    );

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'the OIDC provider answered with HTTP 401'
    );
    expect(element.textContent).not.toContain('No schema found.');
  });

  it('shows the empty state when the registrar has no schema', async () => {
    const element = await render(vi.fn().mockResolvedValue([]));

    expect(element.textContent).toContain('No schema found.');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
