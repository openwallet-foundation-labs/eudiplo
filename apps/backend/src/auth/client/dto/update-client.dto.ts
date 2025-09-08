import { OmitType } from "@nestjs/swagger";
import { ClientEntity } from "../entities/client.entity";

export class UpdateClientDto extends OmitType(ClientEntity, [
    "clientId",
    "tenant",
    "tenantId",
    "secret",
] as const) {}
