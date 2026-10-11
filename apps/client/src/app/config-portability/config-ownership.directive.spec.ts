import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { vi } from 'vitest';

import { ConfigOwnershipDirective } from './config-ownership.directive';
import { ConfigOwnershipService } from './config-ownership.service';

@Component({
  imports: [ConfigOwnershipDirective, RouterLink],
  template: `<button
      class="delete"
      appConfigManaged
      managedKind="PresentationConfig"
      [managedResourceId]="id()"
      (click)="clicked = clicked + 1"
    >
      Delete
    </button>
    <button
      class="edit"
      routerLink="/edit"
      appConfigManaged
      managedKind="PresentationConfig"
      [managedResourceId]="id()"
    >
      Edit
    </button>`,
})
class HostComponent {
  readonly id = signal('pid');
  clicked = 0;
}

interface Lookup {
  id: string;
  resolve: (managed: boolean) => void;
  reject: (error: unknown) => void;
}

describe('ConfigOwnershipDirective', () => {
  /** One pending lookup per call of isManaged, by resource ID. */
  let lookups: Lookup[];

  function render() {
    lookups = [];
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        {
          provide: ConfigOwnershipService,
          useValue: {
            isManaged: vi.fn(
              (_kind: string, id: string) =>
                new Promise<boolean>((resolve, reject) => lookups.push({ id, resolve, reject }))
            ),
          },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const remove = element.querySelector('button.delete') as HTMLButtonElement;
    const edit = element.querySelector('button.edit') as HTMLButtonElement;
    return { fixture, remove, edit, navigate };
  }

  async function answer(fixture: ReturnType<typeof render>['fixture'], managed: boolean) {
    for (const lookup of lookups.splice(0)) lookup.resolve(managed);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('holds clicks and navigation back while the lookup runs', () => {
    const { fixture, remove, edit, navigate } = render();

    expect(remove.getAttribute('aria-busy')).toBe('true');
    expect(remove.style.cursor).toBe('progress');
    remove.click();
    edit.click();
    expect(fixture.componentInstance.clicked).toBe(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('locks a file-managed resource, including its links', async () => {
    const { fixture, remove, edit, navigate } = render();
    await answer(fixture, true);

    expect(remove.getAttribute('aria-busy')).toBeNull();
    expect(remove.getAttribute('aria-disabled')).toBe('true');
    expect(remove.getAttribute('tabindex')).toBe('-1');
    remove.click();
    edit.click();
    expect(fixture.componentInstance.clicked).toBe(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves an unmanaged resource editable', async () => {
    const { fixture, remove, edit, navigate } = render();
    await answer(fixture, false);

    expect(remove.getAttribute('aria-disabled')).toBeNull();
    expect(remove.style.cursor).toBe('');
    remove.click();
    edit.click();
    expect(fixture.componentInstance.clicked).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores a late answer for a resource ID that has changed', async () => {
    const { fixture, remove } = render();
    const stale = lookups.splice(0);
    fixture.componentInstance.id.set('manual');
    fixture.detectChanges();

    for (const lookup of stale) lookup.resolve(true);
    await fixture.whenStable();
    // Re-render the host so any state the late answer left behind shows up.
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    expect(remove.getAttribute('aria-busy')).toBe('true');
    expect(remove.getAttribute('aria-disabled')).toBeNull();

    expect(lookups.every((lookup) => lookup.id === 'manual')).toBe(true);
    await answer(fixture, false);
    expect(remove.getAttribute('aria-busy')).toBeNull();
    expect(remove.getAttribute('aria-disabled')).toBeNull();
  });

  it('leaves the action to the backend when the lookup fails', async () => {
    const { fixture, remove } = render();
    for (const lookup of lookups.splice(0)) lookup.reject({ statusCode: 403 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove.getAttribute('aria-busy')).toBeNull();
    expect(remove.getAttribute('aria-disabled')).toBeNull();
    remove.click();
    expect(fixture.componentInstance.clicked).toBe(1);
  });
});
