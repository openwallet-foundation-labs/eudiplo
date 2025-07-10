import { Column, Entity } from 'typeorm';

@Entity()
export class StatusMapping {
    @Column({ primary: true })
    sessionId: string;

    @Column({ primary: true })
    list: string;

    @Column({ primary: true })
    index: number;

    @Column({ primary: true })
    credentialConfigurationId: string;
}
