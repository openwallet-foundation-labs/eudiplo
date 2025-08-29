import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Represents a tenant in the system.
 */
@Entity()
export class TenantEntity {
    /**
     * The unique identifier for the tenant.
     */
    @PrimaryColumn()
    id: string;

    /**
     * The current status of the tenant.
     */
    @Column({ nullable: true })
    status: string;
}
