import { afterEach, describe, expect, it } from 'vitest';

import { focusIfFocusWasLost } from './focus-if-lost.util';
import { loseFocus } from './settings-screen.testing';

describe('focusIfFocusWasLost', () => {
  const added: HTMLElement[] = [];

  function focusable(tag = 'button'): HTMLElement {
    const element = document.body.appendChild(document.createElement(tag));
    added.push(element);
    return element;
  }

  afterEach(() => added.splice(0).forEach((element) => element.remove()));

  it('focuses the target when focus fell back to the body', () => {
    const target = focusable();
    loseFocus();

    focusIfFocusWasLost(target);

    expect(document.activeElement).toBe(target);
  });

  it('focuses the target when focus is still on the control it leaves', () => {
    const target = focusable();
    const from = focusable();
    from.focus();

    focusIfFocusWasLost(target, from);

    expect(document.activeElement).toBe(target);
  });

  it('leaves focus the user moved elsewhere', () => {
    const target = focusable();
    const from = focusable();
    const elsewhere = focusable('input');
    elsewhere.focus();

    focusIfFocusWasLost(target, from);

    expect(document.activeElement).toBe(elsewhere);
  });
});
