import { OmitType } from "@nestjs/swagger";
import { ClientEntity } from "../entities/client.entity";

export class CreateClientDto extends OmitType(ClientEntity, [
    "tenant",
    "tenantId",
] as const) {}
