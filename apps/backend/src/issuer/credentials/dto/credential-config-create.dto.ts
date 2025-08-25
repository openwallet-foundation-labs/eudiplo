import { OmitType } from "@nestjs/swagger";
import { CredentialConfig } from "../entities/credential.entity";

export class CredentialConfigCreate extends OmitType(CredentialConfig, [
    "tenantId",
    "issuanceConfigs",
    "key",
]) {}
