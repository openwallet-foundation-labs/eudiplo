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
import { CertEntity } from "./cert.entity";

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
     */
    @Column("json")
    key!: JWK;

    /**
     * The usage type of the key.
     */
    @Column("varchar", { default: "sign" })
    usage!: KeyUsage;

    /**
     * Certificates associated with this key.
     */
    @OneToMany(
        () => CertEntity,
        (cert) => cert.key,
    )
    certificates: CertEntity[];

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
