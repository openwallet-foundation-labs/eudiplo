import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import { Column, Entity } from "typeorm";

/**
 * Entity representing the status list for a tenant.
 */
@Entity()
export class StatusListEntity {
    /**
     * The ID of the tenant to which the status list belongs.
     */
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The elements of the status list.
     */
    @Column("json")
    elements: number[];

    /**
     * The stack of available indexes for the status list.
     */
    @Column("json")
    stack: number[];

    /**
     * The number of bits used for each status in the status list.
     */
    @Column("int")
    bits: BitsPerStatus;

    /**
     * The JSON Web Token (JWT) for the status list.
     */
    @Column("varchar", { nullable: true })
    jwt?: string;
}
