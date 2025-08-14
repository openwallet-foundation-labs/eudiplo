import { Column, Entity } from "typeorm";

type DisplayInfo = {
    name: string;
    locale: string;
    logo: {
        uri: string;
        url: string;
    };
};

@Entity()
export class DisplayEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    @Column("json")
    value: DisplayInfo[];
}
