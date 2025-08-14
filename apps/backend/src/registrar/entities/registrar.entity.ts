import { Column, Entity } from "typeorm";

@Entity()
export class RegistrarEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    @Column("varchar")
    relyingPartyId: string;

    @Column("varchar")
    accessCertificateId: string;
}
