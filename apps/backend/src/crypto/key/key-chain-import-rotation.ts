/** Rotation intervals in days that an import with rotation enabled leaves out. */
const IMPORTED_ROTATION_DEFAULTS = {
    intervalDays: 90,
    certValidityDays: 365,
} as const;

/**
 * The intervals stored for a key chain imported with rotation enabled. Kept
 * free of service imports: the configuration bundle plan uses it to report
 * what the import will store.
 */
export function importedRotationIntervals(policy?: {
    intervalDays?: number | null;
    certValidityDays?: number | null;
}): { intervalDays: number; certValidityDays: number } {
    return {
        intervalDays:
            policy?.intervalDays || IMPORTED_ROTATION_DEFAULTS.intervalDays,
        certValidityDays:
            policy?.certValidityDays ||
            IMPORTED_ROTATION_DEFAULTS.certValidityDays,
    };
}
