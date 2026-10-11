import type { KeyChainEntity } from "../../crypto/key/entities/key-chain.entity.js";
import { importedRotationIntervals } from "../../crypto/key/key-chain-import-rotation.js";

type Spec = Record<string, any>;

interface RotationPolicy {
    enabled: boolean;
    intervalDays?: number;
    certValidityDays?: number;
}

/**
 * Null in a rotation value means the same as leaving it out. Earlier exports
 * wrote null for unset values; the legacy importer schema accepts only
 * omitted ones.
 */
export function withoutNullRotationValues(spec: Spec): Spec {
    if (!spec.rotationPolicy || typeof spec.rotationPolicy !== "object")
        return spec;
    const rotationPolicy = { ...spec.rotationPolicy };
    for (const key of ["intervalDays", "certValidityDays"])
        if (rotationPolicy[key] === null) delete rotationPolicy[key];
    return { ...spec, rotationPolicy };
}

/**
 * The rotation policy that applying a key chain document stores, so the plan
 * and the importers agree. The document replaces the stored policy: a value
 * it leaves out or sets to null is not set, and without a policy rotation is
 * off. A private key without `activeJwk` goes through the key chain importer,
 * which keeps the intervals only with rotation and then fills in its defaults.
 */
export function appliedRotationPolicy(spec: Spec): RotationPolicy {
    const policy = spec.rotationPolicy ?? {};
    const enabled: boolean = policy.enabled ?? false;
    const intervalDays = policy.intervalDays ?? undefined;
    const certValidityDays = policy.certValidityDays ?? undefined;
    if (spec.keySource?.type !== "private-jwk" || spec.keySource.activeJwk)
        return { enabled, intervalDays, certValidityDays };
    if (!enabled) return { enabled };
    return { enabled, ...importedRotationIntervals(policy) };
}

/**
 * The columns besides key material that a key chain document replaces. An
 * unset value is null, which clears the column on save; the entity types
 * these nullable columns without null.
 */
export function keyChainSettingsColumns(
    spec: Spec,
): Pick<
    KeyChainEntity,
    | "description"
    | "rotationEnabled"
    | "rotationIntervalDays"
    | "certValidityDays"
> {
    const policy = appliedRotationPolicy(spec);
    return {
        description: spec.description ?? null,
        rotationEnabled: policy.enabled,
        rotationIntervalDays: policy.intervalDays ?? (null as any),
        certValidityDays: policy.certValidityDays ?? (null as any),
    };
}

/** The spec of those columns, for exports and plans; unset values are left out. */
export function keyChainSettingsSpec(keyChain: KeyChainEntity) {
    return {
        description: keyChain.description ?? undefined,
        rotationPolicy: {
            enabled: keyChain.rotationEnabled,
            intervalDays: keyChain.rotationIntervalDays ?? undefined,
            certValidityDays: keyChain.certValidityDays ?? undefined,
        },
    };
}
