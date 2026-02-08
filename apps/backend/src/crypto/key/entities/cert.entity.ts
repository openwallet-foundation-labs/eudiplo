import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CertUsageEntity } from "./cert-usage.entity";
import { KeyEntity } from "./keys.entity";

/**
 * Entity to manage certificates for keys.
 */
@Entity()
export class CertEntity {
    /**
     * Unique identifier for the key.
     */
    @IsString()
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
     * Certificate chain in PEM format (leaf first, then intermediates/CA).
     */
    @IsString({ each: true })
    @Column("simple-json")
    crt!: string[];

    @OneToMany(
        () => CertUsageEntity,
        (u) => u.cert,
        {
            cascade: ["insert", "update", "remove"],
            eager: true,
        },
    )
    usages!: CertUsageEntity[];

    /**
     * Description of the key.
     */
    @IsString()
    @IsOptional()
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * The ID of the key this certificate is associated with.
     */
    @ApiProperty({
        description: "The key ID this certificate is associated with",
        example: "039af178-3ca0-48f4-a2e4-7b1209f30376",
    })
    @IsString()
    @Column("varchar")
    keyId!: string;

    @ManyToOne(
        () => KeyEntity,
        (key) => key.certificates,
        { onDelete: "CASCADE" },
    )
    @JoinColumn([
        { name: "keyId", referencedColumnName: "id" },
        { name: "tenantId", referencedColumnName: "tenantId" },
    ])
    key!: KeyEntity;

    /**
     * The timestamp when the certificate was created.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * The timestamp when the certificate was last updated.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}
