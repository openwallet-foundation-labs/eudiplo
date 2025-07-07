import { Controller, Get } from '@nestjs/common';
import type { CredentialIssuerMetadata } from '@openid4vc/openid4vci';
import { CryptoService } from '../crypto/crypto.service';
import { AuthorizeService } from '../issuer/authorize/authorize.service';
import { Oid4vciService } from '../issuer/oid4vci/oid4vci.service';

@Controller('.well-known')
export class WellKnownController {
  constructor(
    private readonly oid4vciService: Oid4vciService,
    private readonly authorizeService: AuthorizeService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Get('openid-credential-issuer')
  issuerMetadata(): CredentialIssuerMetadata {
    return this.oid4vciService.issuerMetadata().credentialIssuer;
  }

  @Get('oauth-authorization-server')
  authzMetadata() {
    return this.authorizeService.authzMetadata();
  }

  @Get('jwks.json')
  async getJwks() {
    return this.cryptoService.getJwks().then((key) => ({
      keys: [key],
    }));
  }
}
