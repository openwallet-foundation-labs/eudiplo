import { Entity, PrimaryColumn } from "typeorm";

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
}
