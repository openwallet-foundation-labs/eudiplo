import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { importJWK, exportJWK, generateKeyPair, jwtDecrypt, JWK } from 'jose';
import { join } from 'path';
import { TENANT_EVENTS } from '../../auth/tenant-events';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EncryptionService {
    private privateEncryptionKey: CryptoKey;
    private publicEncryptionKey: JWK;
    private privateEnncryptionPath: string;
    private publicEncryptionPath: string;

    constructor(private configService: ConfigService) {}

    @OnEvent(TENANT_EVENTS.TENANT_INIT, { async: true })
    async onTenantInit(tenantId: string) {
        await this.init(tenantId);
    }

    async init(tenantId: string) {
        const folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            'keys',
        );
        this.privateEnncryptionPath = join(folder, 'private-encryption.json');
        this.publicEncryptionPath = join(folder, 'public-encryption.json');
        if (!existsSync(this.privateEnncryptionPath)) {
            await generateKeyPair('ECDH-ES', {
                crv: 'P-256',
                extractable: true,
            }).then(async (secret) => {
                writeFileSync(
                    this.privateEnncryptionPath,
                    JSON.stringify(await exportJWK(secret.privateKey), null, 2),
                );
                writeFileSync(
                    this.publicEncryptionPath,
                    JSON.stringify(await exportJWK(secret.publicKey), null, 2),
                );
            });
        }

        await importJWK(
            JSON.parse(readFileSync(this.privateEnncryptionPath, 'utf-8')),
            'ECDH-ES',
        ).then((key) => {
            this.privateEncryptionKey = key as CryptoKey;
        });
        this.publicEncryptionKey = JSON.parse(
            readFileSync(this.publicEncryptionPath, 'utf-8'),
        ) as JWK;
    }

    async decryptJwe<T>(response: string): Promise<T> {
        const res = await jwtDecrypt<T>(response, this.privateEncryptionKey);
        return res.payload;
    }

    getEncryptionPublicKey() {
        return this.publicEncryptionKey;
    }
}
