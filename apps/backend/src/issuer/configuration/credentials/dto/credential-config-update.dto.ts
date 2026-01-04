import { PartialType } from "@nestjs/swagger";
import { CredentialConfigCreate } from "./credential-config-create.dto";

export class CredentialConfigUpdate extends PartialType(
    CredentialConfigCreate,
) {}
