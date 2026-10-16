import { afterNextRender, DestroyRef, type Injector } from '@angular/core';

/**
 * Focuses `element` when focus has fallen back to `<body>`, for example
 * because the focused control was removed with the content it belonged to,
 * or when it is still on `from`, a control that can no longer be used.
 * Focus the user has moved elsewhere in the meantime stays where it is.
 */
export function focusIfFocusWasLost(element: HTMLElement | undefined, from?: HTMLElement): void {
  const active = document.activeElement;
  if (!active || active === document.body || (from && active === from)) {
    element?.focus();
  }
}

/**
 * Calls `focusIfFocusWasLost` after the next render, when content shown by
 * the change that just happened exists. Nothing happens once the component
 * behind `injector` is destroyed, for example because the user left the page
 * while a request was running.
 */
export function focusAfterRenderIfLost(
  injector: Injector,
  element: () => HTMLElement | undefined,
  from?: () => HTMLElement | undefined
): void {
  if (injector.get(DestroyRef).destroyed) return;
  afterNextRender(() => focusIfFocusWasLost(element(), from?.()), { injector });
}
