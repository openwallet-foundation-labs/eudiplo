import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { digest, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { KbVerifier, Verifier } from '@sd-jwt/types';
import { importJWK, JWK, JWTPayload, jwtVerify } from 'jose';
import { firstValueFrom } from 'rxjs';
import { ResolverService } from '../resolver/resolver.service';
import { ConfigService } from '@nestjs/config';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { join, posix } from 'node:path';
import { VPRequest } from './dto/vp-request.dto';

export interface AuthResponse {
  vp_token: {
    [key: string]: string;
  };
  state: string;
}

@Injectable()
export class PresentationsService {
  sdjwtInstance: SDJwtVcInstance;
  private folder: string;

  constructor(
    private httpService: HttpService,
    private resolverService: ResolverService,
    private configService: ConfigService,
  ) {
    this.sdjwtInstance = new SDJwtVcInstance({
      hasher: digest,
      verifier: this.verifier.bind(this),
      kbVerifier: this.kbVerifier.bind(this),
      statusListFetcher: this.statusListFetcher.bind(this),
    });
    this.folder = join(
      this.configService.getOrThrow<string>('FOLDER'),
      'presentation',
    );
  }

  getPresentations() {
    const files = readdirSync(this.folder);
    return files.map((file) => {
      const config = JSON.parse(
        readFileSync(join(this.folder, file), 'utf-8'),
      ) as VPRequest;
      config.id = file.replace('.json', '');
      return config;
    });
  }

  storePresentationRequest(vprequest: VPRequest) {
    const safeId = posix
      .normalize(vprequest.id)
      .replace(/^(\.\.(\/|\\|$))+/, '');
    writeFileSync(
      join(this.folder, `${safeId}.json`),
      JSON.stringify(vprequest, null, 2),
    );
  }

  deletePresentationRequest(id: string) {
    const safeId = posix.normalize(id).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(this.folder, `${safeId}.json`);
    if (!existsSync(filePath)) {
      throw new ConflictException(
        `Presentation request with id ${id} not found`,
      );
    }
    rmdirSync(filePath, { recursive: true });
  }

  getPresentationRequest(requestId: string): VPRequest {
    const safeId = posix.normalize(requestId).replace(/^(\.\.(\/|\\|$))+/, '');
    if (!existsSync(join(this.folder, `${safeId}.json`))) {
      throw new ConflictException(`Request ID ${requestId} not found`);
    }
    const payload = readFileSync(
      join(this.folder, `${requestId}.json`),
      'utf-8',
    ).replace(
      /<CREDENTIAL_ISSUER>/g,
      this.configService.getOrThrow<string>('CREDENTIAL_ISSUER'),
    );
    return JSON.parse(payload) as VPRequest;
  }

  public storeRCID(id: string, requestId: string) {
    const safeId = posix.normalize(requestId).replace(/^(\.\.(\/|\\|$))+/, '');
    const file = join(this.folder, `${safeId}.json`);
    const payload: VPRequest = JSON.parse(readFileSync(file, 'utf-8'));
    payload.registrationCert.id = id;
    writeFileSync(join(file), JSON.stringify(payload, null, 2));
  }

  /**
   * Verifier for SD-JWT-VCs. It will verify the signature of the SD-JWT-VC and return true if it is valid.
   * @param data
   * @param signature
   * @returns
   */
  verifier: Verifier = async (data, signature) => {
    const instance = new SDJwtVcInstance({
      hasher: digest,
    });
    const decodedVC = await instance.decode(`${data}.${signature}`);
    const payload = decodedVC.jwt?.payload as JWTPayload;
    const header = decodedVC.jwt?.header as JWK;
    const publicKey = await this.resolverService.resolvePublicKey(
      payload,
      header,
    );
    const verify = await ES256.getVerifier(publicKey);
    return verify(data, signature).catch((err) => {
      console.log(err);
      return false;
    });
  };

  /**
   * Fetch the status list from the uri.
   * @param uri
   * @returns
   */
  private statusListFetcher: (uri: string) => Promise<string> = async (
    uri: string,
  ) => {
    return firstValueFrom(this.httpService.get<string>(uri)).then(
      (res) => res.data,
    );
  };

  /**
   * Verifier for keybindings. It will verify the signature of the keybinding and return true if it is valid.
   * @param data
   * @param signature
   * @param payload
   * @returns
   */
  private kbVerifier: KbVerifier = async (data, signature, payload) => {
    if (!payload.cnf) {
      throw new Error('No cnf found in the payload');
    }
    const key = await importJWK(payload.cnf.jwk as JWK, 'ES256');
    return jwtVerify(`${data}.${signature}`, key).then(
      () => true,
      () => false,
    );
  };

  /**
   * Parse the response from the wallet. It will verify the SD-JWT-VCs in the vp_token and return the parsed attestations.
   * @param res
   * @param requiredFields
   * @returns
   */
  parseResponse(
    res: AuthResponse,
    requiredFields: string[],
    keyBindingNonce: string,
  ) {
    const attestations = Object.keys(res.vp_token);
    const att = attestations.map((att) =>
      this.sdjwtInstance.verify(res.vp_token[att], {
        requiredClaimKeys: requiredFields,
        keyBindingNonce,
      }),
    );
    return Promise.all(att);
  }
}
