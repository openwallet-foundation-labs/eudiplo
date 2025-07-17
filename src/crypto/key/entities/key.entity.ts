import { Column, Entity } from 'typeorm';

@Entity()
export class KeyEntity {
    @Column('varchar', { primary: true })
    tenantId: string;
    @Column('json')
    privateKey: JsonWebKey;
}
