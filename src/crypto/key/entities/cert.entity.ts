import { Column, Entity } from 'typeorm';

export type CertificateType = 'access' | 'signing';

@Entity()
export class CertEntity {
    @Column('varchar', { primary: true })
    keyId: string;

    @Column('varchar', { primary: true })
    tenantId: string;

    @Column('varchar')
    crt: string;

    @Column('varchar', { default: 'signing', primary: true })
    type: CertificateType;
}
