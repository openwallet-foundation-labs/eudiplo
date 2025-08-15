import { Column, Entity } from "typeorm";

@Entity()
export class StatusMapping {
    @Column({ type: "varchar", primary: true })
    sessionId: string;

    @Column({ type: "varchar", primary: true })
    list: string;

    @Column({ type: "int", primary: true })
    index: number;

    @Column({ type: "varchar", primary: true })
    credentialConfigurationId: string;
}
