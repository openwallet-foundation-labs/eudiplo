import { JWK } from "jose";
import { Column, Entity } from "typeorm";

/**
 * Key usage types.
 */
export type KeyUsage = "sign" | "encrypt";

@Entity()
export class KeyEntity {
    /**
     * Unique identifier for the key.
     */
    @Column("varchar", { primary: true })
    id: string;

    /**
     * Tenant ID for the key.
     */
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The key material.
     */
    @Column("json")
    key: JWK;

    /**
     * The usage type of the key.
     */
    @Column("varchar", { default: "sign" })
    usage: KeyUsage;
}
