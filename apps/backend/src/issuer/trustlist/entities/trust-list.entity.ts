import { ApiHideProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CertEntity } from "../../../crypto/key/entities/cert.entity";
import type { TrustListEntity } from "../dto/trust-list-create.dto";

/**
 * Entity representing a Trust List used for credential verification.
 */
@Entity()
export class TrustList {
    /**
     * Unique identifier for the trust list
     * */
    @IsUUID()
    @IsOptional()
    @PrimaryGeneratedColumn("uuid")
    id?: string;

    @IsString()
    @IsOptional()
    @Column("varchar")
    description?: string;

    /**
     * The tenant ID for which the VP request is made.
     */
    @ApiHideProperty()
    @Column("varchar", { primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @Column("varchar")
    certId: string;

    @ManyToOne(() => CertEntity, {
        cascade: true,
        onDelete: "CASCADE",
    })
    cert!: CertEntity;

    /**
     * The full trust list JSON (generated LoTE structure)
     */
    @Column({ type: "json", nullable: true })
    @IsObject()
    @IsOptional()
    data?: object;

    /**
     * The original entity configuration used to create this trust list.
     * Stored for round-tripping when editing.
     */
    @Column({ type: "json", nullable: true })
    @IsOptional()
    entityConfig?: TrustListEntity[];

    /**
     * The sequence number for versioning (incremented on updates)
     */
    @Column({ type: "int", default: 1 })
    sequenceNumber: number;

    /**
     * The signed JWT representation of this trust list
     */
    @Column({ type: "varchar" })
    jwt: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
