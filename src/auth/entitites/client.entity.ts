import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ClientEntry {
    @PrimaryColumn()
    id: string;
}
