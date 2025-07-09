import { JWK_EC_Public } from 'jose';

export class EC_Public implements JWK_EC_Public {
    kty: 'EC';
    crv: string;
    x: string;
    y: string;
}

export class JwksResponseDto {
    keys: Array<EC_Public>;
}
