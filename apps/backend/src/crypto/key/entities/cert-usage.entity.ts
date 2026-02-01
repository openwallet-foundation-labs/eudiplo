import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { CertEntity } from "./cert.entity";

export enum CertUsage {
    Access = "access",
    Signing = "signing",
    TrustList = "trustList",
    StatusList = "statusList",
}

@Entity()
@Index(["tenantId", "usage"])
export class CertUsageEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    @Column("varchar", { primary: true })
    certId: string;

    @Column("varchar", { primary: true })
    usage: CertUsage;

    @ManyToOne(
        () => CertEntity,
        (c) => c.usages,
        { onDelete: "CASCADE" },
    )
    @JoinColumn([
        { name: "tenantId", referencedColumnName: "tenantId" },
        { name: "certId", referencedColumnName: "id" },
    ])
    cert: CertEntity;
}
