import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { LoadErrorComponent } from './load-error.component';

describe('LoadErrorComponent', () => {
  it('announces the message and the hint, and retries on request', () => {
    const fixture = TestBed.createComponent(LoadErrorComponent);
    fixture.componentRef.setInput('message', 'Failed to load keys: Forbidden resource');
    fixture.componentRef.setInput(
      'hint',
      'The settings can only be changed after they have been loaded.'
    );
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Failed to load keys: Forbidden resource');
    expect(alert?.textContent).toContain('can only be changed after they have been loaded');

    element.querySelector('button')?.click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('takes the focus a removed card had, but not focus the user moved elsewhere', () => {
    (document.activeElement as HTMLElement | null)?.blur();
    const first = TestBed.createComponent(LoadErrorComponent);
    first.componentRef.setInput('message', 'Failed to load keys');
    first.detectChanges();
    expect(document.activeElement).toBe(first.nativeElement.querySelector('button'));
    first.destroy();

    const input = document.body.appendChild(document.createElement('input'));
    input.focus();
    const second = TestBed.createComponent(LoadErrorComponent);
    second.componentRef.setInput('message', 'Failed to load keys');
    second.detectChanges();
    expect(document.activeElement).toBe(input);
    input.remove();
  });
});
