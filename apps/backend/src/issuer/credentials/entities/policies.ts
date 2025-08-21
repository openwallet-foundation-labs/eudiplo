import { Type } from "class-transformer";
import {
    IsArray,
    IsDefined,
    IsEnum,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

export enum PolicyType {
    NONE = "none",
    ALLOW_LIST = "allowList",
    ROOT_OF_TRUST = "rootOfTrust",
    ATTESTATION_BASED = "attestationBased",
}

export class EmbeddedDisclosurePolicy {
    @IsDefined()
    @IsEnum(PolicyType)
    policy!: PolicyType;
}

/** allowList */
export class AllowListPolicy extends EmbeddedDisclosurePolicy {
    declare policy: PolicyType.ALLOW_LIST;

    @IsDefined()
    @IsString({ each: true })
    values!: string[];
}

/** rootOfTrust */
export class RootOfTrustPolicy extends EmbeddedDisclosurePolicy {
    declare policy: PolicyType.ROOT_OF_TRUST;

    // adapt as needed if you want an array instead
    @IsDefined()
    @IsString()
    values!: string;
}

/** none */
export class NoneTrustPolicy extends EmbeddedDisclosurePolicy {
    declare policy: PolicyType.NONE;
}

/** attestationBased */
export class PolicyCredential {
    @IsOptional()
    @IsArray()
    claims?: any[];

    @IsDefined()
    @IsArray()
    credentials!: any[];

    @IsOptional()
    @IsArray()
    credential_sets?: any[];
}

export class AttestationBasedPolicy extends EmbeddedDisclosurePolicy {
    declare policy: PolicyType.ATTESTATION_BASED;

    @IsDefined()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PolicyCredential)
    values!: PolicyCredential[];
}

// Convenience union type if you use it elsewhere
export type AnyPolicy =
    | NoneTrustPolicy
    | AllowListPolicy
    | RootOfTrustPolicy
    | AttestationBasedPolicy;
