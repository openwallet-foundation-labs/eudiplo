import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsUUID } from "class-validator";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { KeyEntity } from "./keys.entity";

/**
 * Entity to manage certificates for keys.
 */
@Entity()
export class CertEntity {
    /**
     * Unique identifier for the key.
     */
    @Column("varchar", { primary: true })
    id!: string;

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
     * Certificate in PEM format.
     */
    @Column("varchar")
    crt!: string;

    /**
     * Whether this certificate is used for access/authentication.
     */
    @ApiProperty({
        description: "Certificate can be used for access/authentication",
        example: false,
    })
    @IsBoolean()
    @Column("boolean", { default: false })
    isAccessCert!: boolean;

    /**
     * Whether this certificate is used for signing.
     */
    @ApiProperty({
        description: "Certificate can be used for signing",
        example: true,
    })
    @IsBoolean()
    @Column("boolean", { default: false })
    isSigningCert!: boolean;

    /**
     * Description of the key.
     */
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * The ID of the key this certificate is associated with.
     */
    @ApiProperty({
        description: "The key ID this certificate is associated with",
        example: "039af178-3ca0-48f4-a2e4-7b1209f30376",
    })
    @IsUUID()
    @Column("varchar")
    keyId!: string;

    @ManyToOne(
        () => KeyEntity,
        (key) => key.certificates,
        { onDelete: "CASCADE" },
    )
    key!: KeyEntity;

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}
