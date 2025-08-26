import { ApiHideProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { Column, Entity, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../auth/entitites/tenant.entity";

class DisplayLogo {
    @IsString()
    url: string;
}
export class DisplayInfo {
    @IsString()
    name: string;
    @IsString()
    locale: string;

    @ValidateNested()
    @Type(() => DisplayLogo)
    logo: DisplayLogo;
}

@Entity()
export class DisplayEntity {
    @ApiHideProperty()
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant: TenantEntity;

    /**
     * The display information.
     */
    @ValidateNested()
    @Type(() => DisplayInfo)
    @Column("json")
    value: DisplayInfo[];
}
