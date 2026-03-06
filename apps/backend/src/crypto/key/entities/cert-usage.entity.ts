import { Column, Entity, Index } from "typeorm";

/**
 * @deprecated This entity is deprecated. Usage types are now defined at the key level
 * using KeyUsageEntity. This entity is kept for backward compatibility during migrations.
 */
export enum CertUsage {
    Access = "access",
    Signing = "signing",
    TrustList = "trustList",
    StatusList = "statusList",
}

/**
 * @deprecated This entity is deprecated. Usage types are now defined at the key level
 * using KeyUsageEntity. This entity is kept for backward compatibility during migrations.
 */
@Entity()
@Index(["tenantId", "usage"])
export class CertUsageEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    @Column("varchar", { primary: true })
    certId: string;

    @Column("varchar", { primary: true })
    usage: CertUsage;
}
