import { ConflictException } from "@nestjs/common";

/**
 * Thrown when attempting to delete a CA key that has dependent signing keys.
 * Users must delete the dependent keys first before deleting the CA.
 */
export class CaHasDependentKeysException extends ConflictException {
    constructor(caKeyId: string, dependentKeyIds: string[]) {
        super({
            message: `Cannot delete CA key "${caKeyId}": ${dependentKeyIds.length} dependent key(s) still reference it`,
            dependentKeyIds,
            hint: "Delete the dependent keys first, or remove their signingCaKeyId reference",
        });
    }
}
