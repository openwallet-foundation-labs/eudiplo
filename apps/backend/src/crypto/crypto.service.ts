import { createHash, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
    type CallbackContext,
    calculateJwkThumbprint,
    clientAuthenticationNone,
    HashAlgorithm,
    type Jwk,
    SignJwtCallback,
} from '@openid4vc/oauth2';
import * as x509 from '@peculiar/x509';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { importJWK, type JWK, jwtVerify } from 'jose';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm/repository/Repository';
import { EC_Public } from '../well-known/dto/jwks-response.dto';
import { KeyImportDto } from './key/dto/key-import.dto';
import { CertEntity, CertificateType } from './key/entities/cert.entity';
import { KeyService } from './key/key.service';

const ECDSA_P256 = {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: 'SHA-256' as const,
};

/**
 * Service for cryptographic operations, including key management and certificate handling.
 */
@Injectable()
export class CryptoService {
    /**
     * Folder where the keys are stored.
     */
    folder: string;

    /**
     * Constructor for CryptoService.
     * @param configService
     * @param keyService
     * @param certRepository
     */
    constructor(
        private readonly configService: ConfigService,
        @Inject('KeyService') public readonly keyService: KeyService,
        @InjectRepository(CertEntity)
        private certRepository: Repository<CertEntity>,
        private logger: PinoLogger,
    ) {}

    /**
     * Initializes the key service for a specific tenant.
     * @param tenantId
     */
    async onTenantInit(tenantId: string) {
        const keyId = await this.keyService.init(tenantId);
        await this.hasCerts(tenantId, keyId);
    }

    /**
     * Imports keys and certificates from the configured folder.
     * @param tenantId
     * @returns
     */
    getCerts(tenantId: string): Promise<CertEntity[]> {
        return this.certRepository.findBy({
            tenantId,
            type: 'signing',
        });
    }

    /**
     * Imports keys from the file system into the key service.
     */
    async import() {
        if (this.configService.get<boolean>('CONFIG_IMPORT')) {
            const configPath = this.configService.getOrThrow('CONFIG_FOLDER');
            const subfolder = 'keys';
            const force = this.configService.get<boolean>(
                'CONFIG_IMPORT_FORCE',
            );
            if (this.configService.get<boolean>('CONFIG_IMPORT')) {
                const tenantFolders = readdirSync(configPath, {
                    withFileTypes: true,
                }).filter((tenant) => tenant.isDirectory());
                let counter = 0;
                for (const tenant of tenantFolders) {
                    //iterate over all elements in the folder and import them
                    const path = join(configPath, tenant.name, subfolder);
                    const files = readdirSync(path);
                    for (const file of files) {
                        const payload = JSON.parse(
                            readFileSync(join(path, file), 'utf8'),
                        );

                        const id = payload.kid;
                        const exists = await this.keyService
                            .getPublicKey('jwk', tenant.name, id)
                            .catch(() => false);
                        if (exists && !force) {
                            continue; // Skip if config already exists and force is not set
                        }

                        // Validate the payload against KeyImportDto
                        const config = plainToClass(KeyImportDto, payload);
                        const validationErrors = await validate(config, {
                            whitelist: true,
                            forbidNonWhitelisted: true,
                        });

                        if (validationErrors.length > 0) {
                            this.logger.error(
                                {
                                    event: 'ValidationError',
                                    file,
                                    tenant: tenant.name,
                                    errors: validationErrors.map((error) => ({
                                        property: error.property,
                                        constraints: error.constraints,
                                        value: error.value,
                                    })),
                                },
                                `Validation failed for key config ${file} in tenant ${tenant.name}`,
                            );
                            continue; // Skip this invalid config
                        }
                        await this.importKey(tenant.name, config);
                        counter++;
                    }
                    this.logger.info(
                        {
                            event: 'Import',
                        },
                        `${counter} keys imported for ${tenant.name}`,
                    );
                }
            }
        }
    }

    /**
     * Imports a key into the key service.
     * @param tenantId
     * @param body
     * @returns
     */
    async importKey(tenantId: string, body: KeyImportDto): Promise<string> {
        const id = await this.keyService.import(tenantId, body);
        // If the private key has a certificate, write it to the certs folder
        if (body.crt) {
            await this.certRepository.save({
                tenantId,
                id,
                crt: body.crt,
                description: body.description,
            });
        } else {
            // If no certificate is provided, generate a self-signed certificate
            await this.hasCerts(tenantId, id);
            if (body.description) {
                await this.certRepository.update(
                    { tenantId, id },
                    { description: body.description },
                );
            }
        }
        return id;
    }

    /**
     * Ensures a signing certificate (and default access cert) exist for the given tenant/key id.
     */
    async hasCerts(tenantId: string, id?: string) {
        id = id ?? (await this.keyService.getKid(tenantId));

        const existing = await this.certRepository.findOneBy({ tenantId, id });
        if (existing?.crt) return;

        // === Inputs/parameters (subject + SAN hostname) ===
        const subjectCN = this.configService.getOrThrow<string>('RP_NAME');
        const hostname = new URL(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        ).hostname;

        // === Parse the subject public key we want the leaf cert to contain ===
        // Expecting PEM SPKI. If you have JWK, convert or import as CryptoKey first.
        const subjectSpkiPem = await this.keyService.getPublicKey(
            'pem',
            tenantId,
            id,
        );
        const subjectPublicKey = await new x509.PublicKey(
            subjectSpkiPem,
        ).export({ name: 'ECDSA', namedCurve: 'P-256' }, ['verify']);

        // === Create issuer key pair and self-signed issuer certificate ===
        const issuerKeys = await crypto.subtle.generateKey(ECDSA_P256, true, [
            'sign',
            'verify',
        ]);
        const now = new Date();
        const inOneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        const issuerCert = await x509.X509CertificateGenerator.createSelfSigned(
            {
                serialNumber: '01',
                name: `CN=${subjectCN}`,
                notBefore: now,
                notAfter: inOneYear,
                signingAlgorithm: ECDSA_P256,
                keys: issuerKeys,
                extensions: [
                    new x509.BasicConstraintsExtension(true, 0, true), // CA: true, pathLen:0
                    new x509.KeyUsagesExtension(
                        x509.KeyUsageFlags.keyCertSign |
                            x509.KeyUsageFlags.cRLSign,
                        true,
                    ),
                    await x509.SubjectKeyIdentifierExtension.create(
                        issuerKeys.publicKey,
                    ),
                    new x509.SubjectAlternativeNameExtension([
                        { type: 'dns', value: hostname },
                    ]),
                ],
            },
        );

        // === Issue end-entity certificate for the provided public key ===
        const leafCert = await x509.X509CertificateGenerator.create({
            serialNumber: '02',
            subject: `CN=${subjectCN}`,
            issuer: issuerCert.subject, // DN string from issuer
            notBefore: now,
            notAfter: inOneYear,
            signingAlgorithm: ECDSA_P256,
            publicKey: subjectPublicKey, // <-- your key goes into the cert
            signingKey: issuerKeys.privateKey, // signed by issuer
            extensions: [
                new x509.SubjectAlternativeNameExtension([
                    { type: 'dns', value: hostname },
                ]),
                new x509.KeyUsagesExtension(
                    x509.KeyUsageFlags.digitalSignature,
                    false,
                ),
                await x509.SubjectKeyIdentifierExtension.create(
                    subjectPublicKey,
                ),
                await x509.AuthorityKeyIdentifierExtension.create(
                    issuerCert.publicKey,
                ),
            ],
        });

        const crtPem = leafCert.toString('pem'); // PEM-encoded certificate

        // Persist the signing certificate
        await this.certRepository.save({
            tenantId,
            id,
            crt: crtPem,
            type: 'signing',
        });

        // Mirror your logic: if no "access" cert yet, reuse the same PEM
        const accessCount = await this.certRepository.countBy({
            tenantId,
            type: 'access',
        });
        if (accessCount === 0) {
            await this.certRepository.save({
                tenantId,
                id,
                crt: crtPem,
                type: 'access',
            });
        }
    }

    /**
     * Check if a certificate exists for the given tenant and keyId.
     * @param tenantId
     * @param keyId
     * @returns
     */
    hasEntry(tenantId: string, keyId: string): Promise<boolean> {
        return this.certRepository
            .findOneBy({ tenantId, id: keyId })
            .then((cert) => !!cert);
    }

    /**
     * Get a certificate entry by tenantId and keyId.
     * @param tenantId
     * @param keyId
     * @returns
     */
    getCertEntry(tenantId: string, keyId: string): Promise<CertEntity | null> {
        return this.certRepository.findOneBy({ tenantId, id: keyId });
    }

    /**
     * Get the certificate for the given tenant and keyId.
     * @param tenantId
     * @param keyId
     * @returns
     */
    getCert(tenantId: string, keyId: string): Promise<string> {
        return this.certRepository
            .findOneBy({ tenantId, id: keyId })
            .then((cert) => cert!.crt);
    }

    /**
     * Get the certificate chain for the given type to be included in the JWS header.
     * @param type
     * @param tenantId
     * @param keyId
     * @returns
     */
    async getCertChain(
        type: CertificateType = 'signing',
        tenantId: string,
        keyId?: string,
    ) {
        let cert: string;
        if (type === 'signing') {
            keyId = keyId || (await this.keyService.getKid(tenantId));
            cert = await this.getCert(tenantId, keyId);
        } else {
            cert = await this.certRepository
                .findOneByOrFail({
                    tenantId,
                    type: 'access',
                })
                .then((cert) => cert.crt);
        }

        const chain = cert
            .replace('-----BEGIN CERTIFICATE-----', '')
            .replace('-----END CERTIFICATE-----', '')
            .replace(/\r?\n|\r/g, '');
        return [chain];
    }

    /**
     * Store the access certificate for the tenant.
     * @param crt
     * @param tenantId
     */
    async storeAccessCertificate(crt: string, tenantId: string, id: string) {
        await this.certRepository.save({
            tenantId,
            id,
            crt,
            type: 'access',
        });
    }

    /**
     * Sign a JWT with the key service.
     * @param header
     * @param payload
     * @param tenantId
     * @returns
     */
    signJwt(
        header: any,
        payload: any,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        return this.keyService.signJWT(payload, header, tenantId, keyId);
    }

    /**
     * Verify a JWT with the key service.
     * @param compact
     * @param tenantId
     * @param payload
     * @returns
     */
    async verifyJwt(
        compact: string,
        tenantId: string,
        payload?: Record<string, any>,
    ): Promise<{ verified: boolean }> {
        const publicJwk = await this.keyService.getPublicKey('jwk', tenantId);
        const publicCryptoKey = await importJWK(publicJwk, 'ES256');

        try {
            await jwtVerify(compact, publicCryptoKey, {
                currentDate: payload?.exp
                    ? new Date((payload.exp - 300) * 1000)
                    : undefined,
            });
            return { verified: true };
        } catch {
            return { verified: false };
        }
    }
    /**
     * Get the callback context for the key service.
     * @param tenantId
     * @returns
     */
    getCallbackContext(
        tenantId: string,
    ): Omit<CallbackContext, 'encryptJwe' | 'decryptJwe'> {
        return {
            hash: (data, alg) =>
                createHash(alg.replace('-', '').toLowerCase())
                    .update(data)
                    .digest(),
            generateRandom: (bytes) => randomBytes(bytes),
            clientAuthentication: clientAuthenticationNone({
                clientId: 'some-random',
            }),
            //clientId: 'some-random-client-id', // TODO: Replace with your real clientId if necessary
            signJwt: this.getSignJwtCallback(tenantId),
            verifyJwt: async (signer, { compact, payload }) => {
                if (signer.method !== 'jwk') {
                    throw new Error('Signer method not supported');
                }

                const josePublicKey = await importJWK(
                    signer.publicJwk as JWK,
                    signer.alg,
                );
                try {
                    await jwtVerify(compact, josePublicKey, {
                        currentDate: payload?.exp
                            ? new Date((payload.exp - 300) * 1000)
                            : undefined,
                    });
                    return { verified: true, signerJwk: signer.publicJwk };
                } catch {
                    return { verified: false };
                }
            },
        };
    }

    // Helper to generate signJwt callback
    getSignJwtCallback(tenantId: string): SignJwtCallback {
        return async (signer, { header, payload }) => {
            if (signer.method !== 'jwk') {
                throw new Error('Signer method not supported');
            }
            const hashCallback = this.getCallbackContext(tenantId).hash;
            const jwkThumbprint = await calculateJwkThumbprint({
                jwk: signer.publicJwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            const privateThumbprint = await calculateJwkThumbprint({
                jwk: (await this.keyService.getPublicKey(
                    'jwk',
                    tenantId,
                )) as Jwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            if (jwkThumbprint !== privateThumbprint) {
                throw new Error(
                    `No private key available for public jwk \n${JSON.stringify(signer.publicJwk, null, 2)}`,
                );
            }

            const jwt = await this.signJwt(header, payload, tenantId);

            return {
                jwt,
                signerJwk: signer.publicJwk,
            };
        };
    }

    /**
     * Get the JWKs for the tenant.
     * @param tenantId
     * @returns
     */
    getJwks(tenantId: string) {
        return this.keyService.getPublicKey(
            'jwk',
            tenantId,
        ) as Promise<EC_Public>;
    }

    /**
     * Delete a key from the key service and the cert.
     * @param tenantId
     * @param id
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteKey(tenantId: string, id: string) {
        //TODO: before deleting it, make sure it is not used in a configuration
        throw new Error('Method not implemented.');
    }
}
