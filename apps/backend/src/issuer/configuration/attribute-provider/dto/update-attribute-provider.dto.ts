import { PartialType } from "@nestjs/swagger";
import { CreateAttributeProviderDto } from "./create-attribute-provider.dto";

export class UpdateAttributeProviderDto extends PartialType(
    CreateAttributeProviderDto,
) {}
