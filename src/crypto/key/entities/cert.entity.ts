import { Column, Entity } from 'typeorm';

@Entity()
export class CertEntity {
    @Column('varchar', { primary: true })
    keyId: string;

    @Column('varchar', { primary: true })
    tenantId: string;

    @Column('varchar')
    crt: string;
}
