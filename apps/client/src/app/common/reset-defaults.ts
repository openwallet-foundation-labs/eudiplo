/** Why an action of a settings screen cannot be used while another change runs. */
export const WAIT_FOR_CHANGE = 'Wait until the current change has finished';

/**
 * Tooltip of Reset to Defaults on a tenant settings screen. The button stays
 * focusable while it cannot be used, so the tooltip says why, and screen
 * readers read it as the button's description.
 */
export function resetDefaultsTooltip(isSaving: boolean, hasStoredOverride: boolean): string {
  if (isSaving) return WAIT_FOR_CHANGE;
  if (!hasStoredOverride) {
    return 'Nothing to reset: this tenant already follows the global defaults';
  }
  return 'Reset to global defaults';
}
