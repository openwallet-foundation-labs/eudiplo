import { OmitType } from "@nestjs/swagger";
import { AttributeProviderEntity } from "../entities/attribute-provider.entity";

export class CreateAttributeProviderDto extends OmitType(
    AttributeProviderEntity,
    ["tenantId", "tenant"],
) {}
