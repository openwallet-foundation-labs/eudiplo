import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { KeyEntity } from "./keys.entity";

/**
 * Key usage types for different purposes in the system.
 */
export enum KeyUsageType {
    /** Used for OAuth/OIDC access token signing and authentication */
    Access = "access",
    /** Used for credential signing (SD-JWT VC, mDOC, etc.) */
    Signing = "signing",
    /** Used for trust list signing */
    TrustList = "trustList",
    /** Used for status list (credential revocation) signing */
    StatusList = "statusList",
}

/**
 * Entity to manage key usage assignments.
 * Links usage types to keys, allowing each key to have multiple purposes.
 */
@Entity()
@Index(["tenantId", "usage"])
export class KeyUsageEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    @Column("varchar", { primary: true })
    keyId: string;

    @Column("varchar", { primary: true })
    usage: KeyUsageType;

    @ManyToOne(
        () => KeyEntity,
        (k) => k.usages,
        { onDelete: "CASCADE" },
    )
    @JoinColumn([
        { name: "tenantId", referencedColumnName: "tenantId" },
        { name: "keyId", referencedColumnName: "id" },
    ])
    key: KeyEntity;
}
