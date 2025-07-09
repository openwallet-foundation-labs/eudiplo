import { Column, PrimaryColumn } from 'typeorm';

export class StatusMapping {
    @PrimaryColumn()
    id: string;

    @Column()
    list: string;

    @Column()
    index: number;
}
