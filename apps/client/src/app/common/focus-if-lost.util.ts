/**
 * Focuses `element` when focus has fallen back to `<body>`, for example
 * because the focused control was removed with the content it belonged to.
 * Focus the user has moved elsewhere in the meantime stays where it is.
 */
export function focusIfFocusWasLost(element: HTMLElement | undefined): void {
  const active = document.activeElement;
  if (!active || active === document.body) {
    element?.focus();
  }
}
