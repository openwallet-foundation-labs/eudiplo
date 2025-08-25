import { Column, Entity, PrimaryColumn } from "typeorm";

export type ClientStatus = "init" | "set up" | "error";

@Entity()
export class TenantEntity {
    @PrimaryColumn()
    id: string;

    @Column("varchar", { default: "init" })
    status: ClientStatus;

    @Column("varchar", { nullable: true })
    error?: string;
}
