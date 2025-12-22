import { EC_Public } from "../../../issuer/issuance/oid4vci/well-known/dto/jwks-response.dto";

export class KeyResponseDto {
    keys!: EC_Public[];
}
