import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from '@badgateway/oauth2-client';
import { client } from './generated/client.gen';
import {
  accessCertificateControllerAccessCertificates,
  accessCertificateControllerRegister,
  registrationCertificateControllerAll,
  registrationCertificateControllerRegister,
  relyingPartyControllerRegister,
} from './generated';
import { CryptoService } from 'src/crypto/crypto.service';
import { RegistrationCertificateRequest } from 'src/verifier/presentations/dto/vp-request.dto';
import { PresentationsService } from 'src/verifier/presentations/presentations.service';
@Injectable()
export class RegistrarService implements OnApplicationBootstrap {
  private oauth2Client: OAuth2Client;
  client: typeof client;
  private accessToken: string;

  constructor(
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private presentationsService: PresentationsService,
  ) {
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const authServerUrl = this.configService.getOrThrow<string>(
      'KEYCLOAK_AUTH_SERVER_URL',
    );
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_RESOURCE');
    const clientSecret = this.configService.getOrThrow<string>(
      'KEYCLOAK_CREDENTIALS_SECRET',
    );
    this.oauth2Client = new OAuth2Client({
      server: `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`,
      clientId,
      clientSecret,
      discoveryEndpoint: `${authServerUrl}/realms/${realm}/.well-known/openid-configuration`,
    });

    this.client = client;
    this.client.setConfig({
      baseUrl: this.configService.getOrThrow<string>('REGISTRAR_URL'),
      //should also work
      auth: () => this.accessToken,
      //auth: this.getAccessToken.bind(this),
    });
  }

  /**
   * This function is called when the module is initialized.
   * It will refresh the access token and add the relying party and certificates to the registrar.
   */
  async onApplicationBootstrap() {
    await this.refreshAccessToken();
    //check if the rp id is already set. If not, add it.
    const rpid = this.configService.get<string>('REGISTRAR_RP_ID');
    if (!rpid) {
      await this.addRp();
    }
    await this.addAccessCertificate();
  }

  /**
   * Get the access token from Keycloak using client credentials grant.
   */
  async refreshAccessToken() {
    await this.oauth2Client.clientCredentials().then((token) => {
      this.accessToken = token.accessToken;
      const date = new Date();
      const expirationDate = new Date(token.expiresAt as number);
      setTimeout(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        () => this.refreshAccessToken(),
        expirationDate.getTime() - date.getTime() - 1000,
      );
    });
  }

  /**
   * Add a new relying party to the registrar.
   * This is only needed once, when the relying party is created.
   */
  async addRp() {
    await relyingPartyControllerRegister({
      client: this.client,
      body: {
        name: this.configService.getOrThrow<string>('REGISTRAR_RP_NAME'),
      },
    }).then((response) => {
      if (response.error) {
        console.error('Error adding RP:', response.error);
        throw new Error('Error adding RP');
      }
      console.log('Response:', response.data);
      //TODO: rp id has to be stored in the config
    });
  }

  /**
   * Add a new access certificate to the registrar.
   * This is only needed once, when the access certificate is created.
   * If the access certificate already exists, it will be returned.
   * @returns
   */
  async addAccessCertificate(): Promise<string> {
    const cert = await accessCertificateControllerAccessCertificates({
      client: this.client,
      path: {
        rp: this.configService.get<string>('REGISTRAR_RP_ID'),
      },
    }).then((res) =>
      res.data?.find(
        (cert) =>
          !this.configService.get<boolean>('REGISTRAR_RENEW') &&
          cert.revoked == null,
      ),
    );
    if (cert) {
      return cert.id;
    }

    const host = this.configService
      .getOrThrow<string>('CREDENTIAL_ISSUER')
      .replace('https://', '');
    return accessCertificateControllerRegister({
      client: this.client,
      body: {
        publicKey: await this.cryptoService.keyService.getPublicKey('pem'),
        dns: [host],
      },
      path: {
        rp: this.configService.get<string>('REGISTRAR_RP_ID'),
      },
    }).then((res) => {
      if (res.error) {
        console.error('Error adding access certificate:', res.error);
        throw new Error('Error adding access certificate');
      }
      //store the cert
      this.cryptoService.storeAccessCertificate(res.data!.crt);
      return res.data!.id;
    });
  }

  /**
   * Add a new registration certificate to the registrar.
   * This is only needed once, when the registration certificate is created.
   * If the registration certificate already exists, it will be returned.
   * @returns
   */
  async addRegistrationCertificate(
    req: RegistrationCertificateRequest,
    dcql_query: any,
    requestId: string,
  ) {
    const certs =
      (await registrationCertificateControllerAll({
        client: this.client,
        path: {
          rp: this.configService.get<string>('REGISTRAR_RP_ID'),
        },
      }).then((res) =>
        res.data?.filter(
          (cert) =>
            !this.configService.get<boolean>('REGISTRAR_RENEW') &&
            cert.revoked == null &&
            cert.id === req.id,
        ),
      )) || [];

    if (certs?.length > 0) {
      return certs[0].jwt;
    }

    return registrationCertificateControllerRegister({
      client: this.client,
      path: {
        rp: this.configService.get<string>('REGISTRAR_RP_ID'),
      },
      body: req.body,
    }).then((res) => {
      if (res.error) {
        console.error('Error adding registration certificate:', res.error);
        throw new Error('Error adding registration certificate');
      }

      //TODO: write the ID to the config so its easier to use it. Easier than writing the comparison algorithm (any maybe someone wants to use a different one)
      this.presentationsService.storeRCID(res.data!.id, requestId);
      return res.data!.jwt;
    });
  }
}
