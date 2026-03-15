import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Session } from "./session.entity";

export type SessionLogLevel = "info" | "warn" | "error";

@Entity()
export class SessionLogEntry {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column("varchar")
    sessionId!: string;

    @ManyToOne(() => Session, { onDelete: "CASCADE" })
    session!: Session;

    @CreateDateColumn()
    timestamp!: Date;

    @Column("varchar")
    level!: SessionLogLevel;

    @Column("varchar", { nullable: true })
    stage?: string;

    @Column("varchar")
    message!: string;

    @Column("json", { nullable: true })
    detail?: Record<string, unknown>;
}
