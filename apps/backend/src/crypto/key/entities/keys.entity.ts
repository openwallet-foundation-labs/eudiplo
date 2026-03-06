import { IsOptional, IsString } from "class-validator";
import { JWK } from "jose";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { EncryptedJsonTransformer } from "../../../shared/utils/encryption";
import { CertEntity } from "./cert.entity";
import { KeyUsageEntity } from "./key-usage.entity";

/**
 * Key usage types.
 */
export type KeyUsage = "sign" | "encrypt";

@Entity()
export class KeyEntity {
    /**
     * Unique identifier for the key.
     */
    @IsString()
    @Column("varchar", { primary: true })
    id!: string;

    /**
     * Description of the key.
     */
    @IsString()
    @IsOptional()
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * Tenant ID for the key.
     */
    @Column("varchar", { primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * The key material.
     * Encrypted at rest using AES-256-GCM.
     */
    @Column("text", { transformer: EncryptedJsonTransformer })
    key!: JWK;

    /**
     * The usage type of the key.
     */
    @Column("varchar", { default: "sign" })
    usage!: KeyUsage;

    /**
     * The KMS provider used for this key.
     * References a configured KMS provider name.
     */
    @IsString()
    @IsOptional()
    @Column("varchar", { default: "db" })
    kmsProvider!: string;

    /**
     * External key identifier for cloud KMS providers (e.g., AWS KMS Key ID, Azure Key Vault Key ID).
     * This field stores the provider-specific key reference, keeping it separate from the JWK.
     * Only populated for keys managed by external KMS providers (not for "db" provider).
     */
    @IsString()
    @IsOptional()
    @Column("varchar", { nullable: true })
    externalKeyId?: string;

    /**
     * Certificates associated with this key.
     */
    @OneToMany(
        () => CertEntity,
        (cert) => cert.key,
    )
    certificates: CertEntity[];

    /**
     * Usage assignments for this key.
     * Defines what purposes this key is used for (access, signing, trustList, statusList).
     */
    @OneToMany(
        () => KeyUsageEntity,
        (u) => u.key,
        {
            cascade: ["insert", "update", "remove"],
            eager: true,
        },
    )
    usages!: KeyUsageEntity[];

    /**
     * The timestamp when the key was created.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * The timestamp when the key was last updated.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}
