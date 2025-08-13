import { EC_Public } from '../../../well-known/dto/jwks-response.dto';

export class KeyResponseDto {
    keys: EC_Public[];
}
