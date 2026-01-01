import { ApiHideProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, IsUUID } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CertEntity } from "../../../crypto/key/entities/cert.entity";

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
    id: string;

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

    @ApiHideProperty()
    @Column("varchar")
    certId: string;

    @ManyToOne(() => CertEntity, {
        cascade: true,
        onDelete: "CASCADE",
    })
    cert!: CertEntity;

    /**
     * The full trust list JSON
     */
    @Column({ type: "json", nullable: true })
    @IsObject()
    @IsOptional()
    data?: object; // The full trust list JSON

    @Column({ type: "varchar" })
    jwt: string;
}
