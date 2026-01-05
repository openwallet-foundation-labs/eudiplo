import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { TrustList } from "./trust-list.entity";

/**
 * Entity representing a historical version of a Trust List for audit purposes.
 */
@Entity()
export class TrustListVersion {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column("varchar")
    trustListId: string;

    @ManyToOne(() => TrustList, { onDelete: "CASCADE" })
    trustList: TrustList;

    @Column("varchar")
    tenantId: string;

    /**
     * The sequence number at the time this version was created
     */
    @Column({ type: "int" })
    sequenceNumber: number;

    /**
     * The full trust list JSON at this version
     */
    @Column({ type: "json" })
    data: object;

    /**
     * The entity configuration at this version
     */
    @Column({ type: "json", nullable: true })
    entityConfig?: object;

    /**
     * The signed JWT at this version
     */
    @Column({ type: "text" })
    jwt: string;

    @CreateDateColumn()
    createdAt: Date;
}
