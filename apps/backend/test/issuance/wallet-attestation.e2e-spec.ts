import { INestApplication } from "@nestjs/common";
import {
    clientAuthenticationAnonymous,
    clientAuthenticationClientAttestationJwt,
    Jwk,
    JwtSignerJwk,
} from "@openid4vc/oauth2";
import { Openid4vciClient } from "@openid4vc/openid4vci";
import * as x509 from "@peculiar/x509";
import { X509Certificate, X509CertificateGenerator } from "@peculiar/x509";
import { digest } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import {
    exportJWK,
    exportPKCS8,
    exportSPKI,
    generateKeyPair,
    importPKCS8,
    SignJWT,
} from "jose";
import nock from "nock";
import request from "supertest";
import { App } from "supertest/types";
import { Agent, setGlobalDispatcher } from "undici";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { IssuanceDto } from "../../src/issuer/configuration/issuance/dto/issuance.dto";
import {
    callbacks,
    getSignJwtCallback,
    IssuanceTestContext,
    setupIssuanceTestApp,
} from "../utils";

setGlobalDispatcher(
    new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    }),
);

/**
 * Helper to generate a self-signed certificate for testing.
 * Returns both the certificate and its private key.
 */
async function generateSelfSignedCertificate() {
    // Generate EC key pair
    const keyPair = await globalThis.crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true,
        ["sign", "verify"],
    );

    const alg = {
        name: "ECDSA",
        hash: "SHA-256",
    };

    // Set up the x509 crypto provider
    x509.cryptoProvider.set(globalThis.crypto);

    const cert = await X509CertificateGenerator.createSelfSigned({
        serialNumber: "01",
        name: "CN=Test Wallet Provider",
        notBefore: new Date(),
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        signingAlgorithm: alg,
        keys: keyPair,
    });

    return {
        certificate: cert,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
    };
}

/**
 * Creates a mock LoTE trust list JWT containing the given certificate.
 * Optionally includes a revocation certificate for status list verification.
 */
async function createMockTrustListJwt(
    signingCert: {
        certificate: X509Certificate;
        privateKey: CryptoKey;
    },
    walletProviderCert: X509Certificate,
    serviceType: string,
    revocationCert?: X509Certificate,
): Promise<string> {
    // Export the private key for jose signing
    const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey(
        "pkcs8",
        signingCert.privateKey,
    );
    const privateKeyPem =
        "-----BEGIN PRIVATE KEY-----\n" +
        Buffer.from(privateKeyArrayBuffer).toString("base64") +
        "\n-----END PRIVATE KEY-----";
    const signingKey = await importPKCS8(privateKeyPem, "ES256");

    const x5c = signingCert.certificate.toString("base64");
    const walletCertBase64 = walletProviderCert.toString("base64");

    // Build services list
    const services = [
        {
            ServiceInformation: {
                ServiceTypeIdentifier: serviceType,
                ServiceName: [
                    {
                        lang: "en",
                        value: "Wallet Provider Service",
                    },
                ],
                ServiceDigitalIdentity: {
                    X509Certificates: [{ val: walletCertBase64 }],
                },
            },
        },
    ];

    // Add revocation service if provided
    if (revocationCert) {
        const revocationCertBase64 = revocationCert.toString("base64");
        services.push({
            ServiceInformation: {
                ServiceTypeIdentifier:
                    "http://uri.etsi.org/19602/SvcType/EAA/Revocation",
                ServiceName: [
                    {
                        lang: "en",
                        value: "Revocation Service",
                    },
                ],
                ServiceDigitalIdentity: {
                    X509Certificates: [{ val: revocationCertBase64 }],
                },
            },
        });
    }

    const lotePayload = {
        ListAndSchemeInformation: {
            LoTEVersionIdentifier: 1,
            LoTESequenceNumber: 1,
            LoTEType: "http://uri.etsi.org/19602/LoTEType/EUEAAProvidersList",
            StatusDeterminationApproach:
                "http://uri.etsi.org/19602/EUEAAProvidersList/StatusDetn/EU",
            SchemeTerritory: "EU",
            NextUpdate: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            ListIssueDateTime: new Date().toISOString(),
            SchemeOperatorName: [{ lang: "en", value: "Test Operator" }],
        },
        TrustedEntitiesList: [
            {
                TrustedEntityInformation: {
                    TEName: [{ lang: "en", value: "Test Wallet Provider" }],
                },
                TrustedEntityServices: services,
            },
        ],
    };

    const jwt = await new SignJWT(lotePayload)
        .setProtectedHeader({
            alg: "ES256",
            typ: "JWT",
            x5c: [x5c],
        })
        .setIssuedAt()
        .setExpirationTime("1y")
        .sign(signingKey);

    return jwt;
}

/**
 * Creates a status list JWT for testing.
 * @param signingCert The certificate and key to sign with (should be the revocation cert)
 * @param statusListUri The URI where this status list is hosted
 * @param statusValues Map of index to status value (0=valid, 1=invalid, 2=suspended)
 */
async function createStatusListJwt(
    signingCert: {
        certificate: X509Certificate;
        privateKey: CryptoKey;
    },
    statusListUri: string,
    statusValues: Map<number, number> = new Map(),
): Promise<string> {
    // Export the private key for jose signing
    const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey(
        "pkcs8",
        signingCert.privateKey,
    );
    const privateKeyPem =
        "-----BEGIN PRIVATE KEY-----\n" +
        Buffer.from(privateKeyArrayBuffer).toString("base64") +
        "\n-----END PRIVATE KEY-----";
    const signingKey = await importPKCS8(privateKeyPem, "ES256");

    const x5c = signingCert.certificate.toString("base64");

    // Create a simple status list with 1 bit per status (supports 0=valid, 1=revoked)
    // For simplicity, we create a small list that can hold a few statuses
    // The status list is a base64url-encoded byte array where each byte can hold 8 statuses
    const listSize = 16; // 16 bytes = 128 statuses
    const statusBytes = new Uint8Array(listSize);

    // Set status values at specific indices
    for (const [index, status] of statusValues) {
        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;
        if (byteIndex < listSize && status === 1) {
            statusBytes[byteIndex] |= 1 << bitIndex;
        }
    }

    // Compress the status list (simple zlib deflate simulation - for testing we'll use raw)
    // In production, @sd-jwt/jwt-status-list handles this properly
    const compressedList = Buffer.from(statusBytes).toString("base64url");

    const payload = {
        iss: "https://wallet-provider.example.com",
        sub: statusListUri,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        ttl: 300, // 5 minute TTL
        status_list: {
            bits: 1,
            lst: compressedList,
        },
    };

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({
            alg: "ES256",
            typ: "statuslist+jwt",
            x5c: [x5c],
        })
        .sign(signingKey);

    return jwt;
}

/**
 * Creates a wallet attestation JWT with x5c header.
 * Optionally includes a status claim for status list verification testing.
 */
async function createWalletAttestationJwt(options: {
    walletProviderCert: X509Certificate;
    walletProviderKey: CryptoKey;
    holderPublicKey: Jwk;
    authorizationServer: string;
    status?: {
        status_list: {
            idx: number;
            uri: string;
        };
    };
}): Promise<string> {
    // Export the private key for jose signing
    const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey(
        "pkcs8",
        options.walletProviderKey,
    );
    const privateKeyPem =
        "-----BEGIN PRIVATE KEY-----\n" +
        Buffer.from(privateKeyArrayBuffer).toString("base64") +
        "\n-----END PRIVATE KEY-----";
    const signingKey = await importPKCS8(privateKeyPem, "ES256");

    const x5c = options.walletProviderCert.toString("base64");

    const payload: Record<string, unknown> = {
        iss: "https://wallet-provider.example.com",
        sub: "wallet-instance-id",
        aud: [options.authorizationServer],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        cnf: {
            jwk: options.holderPublicKey,
        },
    };

    // Add status claim if provided
    if (options.status) {
        payload.status = options.status;
    }

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({
            alg: "ES256",
            typ: "oauth-client-attestation+jwt",
            x5c: [x5c],
        })
        .sign(signingKey);

    return jwt;
}

/**
 * Creates a wallet attestation PoP JWT.
 */
async function createWalletAttestationPopJwt(options: {
    holderPrivateKey: CryptoKey;
    holderPublicKey: Jwk;
    authorizationServer: string;
    nonce?: string;
}): Promise<string> {
    // Export the private key for jose signing
    const privateKeyArrayBuffer = await globalThis.crypto.subtle.exportKey(
        "pkcs8",
        options.holderPrivateKey,
    );
    const privateKeyPem =
        "-----BEGIN PRIVATE KEY-----\n" +
        Buffer.from(privateKeyArrayBuffer).toString("base64") +
        "\n-----END PRIVATE KEY-----";
    const signingKey = await importPKCS8(privateKeyPem, "ES256");

    const payload: Record<string, unknown> = {
        iss: "wallet-instance-id",
        aud: [options.authorizationServer],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        jti: globalThis.crypto.randomUUID(),
    };

    if (options.nonce) {
        payload.nonce = options.nonce;
    }

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({
            alg: "ES256",
            typ: "wallet-attestation-pop+jwt",
            jwk: options.holderPublicKey,
        })
        .sign(signingKey);

    return jwt;
}

describe("Issuance - Wallet Attestation", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let ctx: IssuanceTestContext;
    let walletProviderCert: {
        certificate: X509Certificate;
        privateKey: CryptoKey;
        publicKey: CryptoKey;
    };
    let trustListSigningCert: {
        certificate: X509Certificate;
        privateKey: CryptoKey;
        publicKey: CryptoKey;
    };
    let revocationCert: {
        certificate: X509Certificate;
        privateKey: CryptoKey;
        publicKey: CryptoKey;
    };

    beforeAll(async () => {
        ctx = await setupIssuanceTestApp();
        app = ctx.app;
        authToken = ctx.authToken;

        // Generate certificates for testing
        walletProviderCert = await generateSelfSignedCertificate();
        trustListSigningCert = await generateSelfSignedCertificate();
        revocationCert = await generateSelfSignedCertificate();
    });

    beforeEach(() => {
        // Enable nock to intercept HTTP requests
        nock.disableNetConnect();
        // Allow localhost connections for the test app itself (but not port 8787 which we mock)
        nock.enableNetConnect(/127\.0\.0\.1/);
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    afterAll(async () => {
        await app.close();
    });

    test("should succeed with valid wallet attestation when required", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl = "http://localhost:8787/wallet-providers";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Mock the trust list endpoint
        const trustListJwt = await createMockTrustListJwt(
            trustListSigningCert,
            walletProviderCert.certificate,
            "http://uri.etsi.org/19602/SvcType/WalletProvider",
        );

        const nockScope = nock("http://localhost:8787")
            .get("/wallet-providers")
            .reply(200, trustListJwt, {
                "Content-Type": "application/jwt",
            });

        // Verify nock is set up correctly
        expect(nockScope.isDone()).toBe(false); // Should not be called yet

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);
        holderPublicKeyJwk.alg = "ES256";
        holderPublicKeyJwk.use = "sig";

        const credentialOffer = await new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        }).resolveCredentialOffer(offerResponse.body.uri);

        const issuerMetadata = await new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        }).resolveIssuerMetadata(credentialOffer.credential_issuer);

        // Get authorization server URL for attestation
        const authServerUrl =
            issuerMetadata.authorizationServers?.[0]?.issuer ||
            credentialOffer.credential_issuer;

        // Create wallet attestation
        const clientAttestationJwt = await createWalletAttestationJwt({
            walletProviderCert: walletProviderCert.certificate,
            walletProviderKey: walletProviderCert.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
        });

        // Create a client with attestation-based authentication
        const clientWithAttestation = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationClientAttestationJwt({
                    clientAttestationJwt,
                    callbacks: {
                        signJwt: getSignJwtCallback([
                            holderPrivateKeyJwk as Jwk,
                        ]),
                        generateRandom: callbacks.generateRandom,
                    },
                }),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        // Try to get access token with wallet attestation
        const tokenResult =
            await clientWithAttestation.retrievePreAuthorizedCodeAccessTokenFromOffer(
                {
                    credentialOffer,
                    issuerMetadata,
                },
            );

        expect(tokenResult.accessTokenResponse.access_token).toBeDefined();

        // Verify nock was called
        expect(nockScope.isDone()).toBe(true);
    }, 30000);

    test("should fail when wallet attestation is required but not provided", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl = "http://trust-list.example.com/wallet-providers";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );
        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        // Try to get access token WITHOUT wallet attestation
        await expect(
            client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
                // No clientAttestation provided
            }),
        ).rejects.toThrow();
    });

    test("should fail when wallet provider is not in trust list", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl =
            "http://trust-list.example.com/wallet-providers-empty";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Generate a DIFFERENT wallet provider certificate (not in trust list)
        const untrustedWalletCert = await generateSelfSignedCertificate();

        // Mock the trust list endpoint with the ORIGINAL wallet provider cert
        // so the new untrusted cert won't match
        const trustListJwt = await createMockTrustListJwt(
            trustListSigningCert,
            walletProviderCert.certificate, // Original trusted cert
            "http://uri.etsi.org/19602/SvcType/EAA/WalletProvider",
        );

        nock("http://trust-list.example.com")
            .get("/wallet-providers-empty")
            .reply(200, trustListJwt, {
                "Content-Type": "application/jwt",
            });

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);
        holderPublicKeyJwk.alg = "ES256";
        holderPublicKeyJwk.use = "sig";

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );
        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        const authServer =
            issuerMetadata.authorizationServers?.[0] ||
            credentialOffer.credential_issuer;

        // Create wallet attestation with UNTRUSTED certificate
        const clientAttestationJwt = await createWalletAttestationJwt({
            walletProviderCert: untrustedWalletCert.certificate,
            walletProviderKey: untrustedWalletCert.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServer,
        });

        const clientAttestationPopJwt = await createWalletAttestationPopJwt({
            holderPrivateKey: holderKeyPair.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServer,
        });

        // Try to get access token - should fail because cert is not in trust list
        await expect(
            client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
                clientAttestation: {
                    clientAttestationJwt,
                    clientAttestationPopJwt,
                },
            }),
        ).rejects.toThrow();
    });

    test("should succeed when wallet attestation is not required", async () => {
        // Clean up any pending nock mocks
        nock.cleanAll();

        // Configure issuance WITHOUT wallet attestation required
        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: false,
                walletProviderTrustLists: [],
            } as IssuanceDto)
            .expect(201);

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );
        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        // Get access token WITHOUT wallet attestation - should succeed
        const tokenResult =
            await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
            });

        expect(tokenResult.accessTokenResponse.access_token).toBeDefined();
    });

    test("should succeed with valid status when status list is signed by revocation cert", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl = "http://localhost:8787/wallet-providers-status";
        const statusListUrl = "http://localhost:8787/status-list";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Mock the trust list endpoint with revocation cert
        const trustListJwt = await createMockTrustListJwt(
            trustListSigningCert,
            walletProviderCert.certificate,
            "http://uri.etsi.org/19602/SvcType/WalletProvider",
            revocationCert.certificate,
        );

        nock("http://localhost:8787")
            .get("/wallet-providers-status")
            .reply(200, trustListJwt, {
                "Content-Type": "application/jwt",
            });

        // Mock the status list endpoint - signed by revocation cert
        // Status at index 0 is valid (0)
        const statusListJwt = await createStatusListJwt(
            revocationCert,
            statusListUrl,
            new Map(), // Empty = all valid
        );

        nock("http://localhost:8787")
            .get("/status-list")
            .reply(200, statusListJwt, {
                "Content-Type": "application/statuslist+jwt",
            });

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);
        holderPublicKeyJwk.alg = "ES256";
        holderPublicKeyJwk.use = "sig";

        const credentialOffer = await new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        }).resolveCredentialOffer(offerResponse.body.uri);

        const issuerMetadata = await new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        }).resolveIssuerMetadata(credentialOffer.credential_issuer);

        const authServerUrl =
            issuerMetadata.authorizationServers?.[0]?.issuer ||
            credentialOffer.credential_issuer;

        // Create wallet attestation with status claim
        const clientAttestationJwt = await createWalletAttestationJwt({
            walletProviderCert: walletProviderCert.certificate,
            walletProviderKey: walletProviderCert.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
            status: {
                status_list: {
                    idx: 0,
                    uri: statusListUrl,
                },
            },
        });

        const clientWithAttestation = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationClientAttestationJwt({
                    clientAttestationJwt,
                    callbacks: {
                        signJwt: getSignJwtCallback([
                            holderPrivateKeyJwk as Jwk,
                        ]),
                        generateRandom: callbacks.generateRandom,
                    },
                }),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        // Should succeed - status is valid and signed by correct revocation cert
        const tokenResult =
            await clientWithAttestation.retrievePreAuthorizedCodeAccessTokenFromOffer(
                {
                    credentialOffer,
                    issuerMetadata,
                },
            );

        expect(tokenResult.accessTokenResponse.access_token).toBeDefined();
    }, 30000);

    test("should fail when status list is signed by wrong certificate", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl =
            "http://localhost:8787/wallet-providers-wrong-signer";
        const statusListUrl = "http://localhost:8787/status-list-wrong-signer";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Mock the trust list endpoint with revocation cert
        const trustListJwt = await createMockTrustListJwt(
            trustListSigningCert,
            walletProviderCert.certificate,
            "http://uri.etsi.org/19602/SvcType/WalletProvider",
            revocationCert.certificate,
        );

        nock("http://localhost:8787")
            .get("/wallet-providers-wrong-signer")
            .reply(200, trustListJwt, {
                "Content-Type": "application/jwt",
            });

        // Generate a DIFFERENT certificate to sign the status list (wrong signer)
        const wrongSignerCert = await generateSelfSignedCertificate();

        // Mock the status list endpoint - signed by WRONG cert (not the revocation cert)
        const statusListJwt = await createStatusListJwt(
            wrongSignerCert,
            statusListUrl,
            new Map(), // All valid
        );

        nock("http://localhost:8787")
            .get("/status-list-wrong-signer")
            .reply(200, statusListJwt, {
                "Content-Type": "application/statuslist+jwt",
            });

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);
        holderPublicKeyJwk.alg = "ES256";
        holderPublicKeyJwk.use = "sig";

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );
        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        const authServerUrl =
            issuerMetadata.authorizationServers?.[0]?.issuer ||
            credentialOffer.credential_issuer;

        // Create wallet attestation with status claim
        const clientAttestationJwt = await createWalletAttestationJwt({
            walletProviderCert: walletProviderCert.certificate,
            walletProviderKey: walletProviderCert.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
            status: {
                status_list: {
                    idx: 0,
                    uri: statusListUrl,
                },
            },
        });

        const clientAttestationPopJwt = await createWalletAttestationPopJwt({
            holderPrivateKey: holderKeyPair.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
        });

        // Should fail - status list is signed by wrong certificate
        await expect(
            client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
                clientAttestation: {
                    clientAttestationJwt,
                    clientAttestationPopJwt,
                },
            }),
        ).rejects.toThrow();
    }, 30000);

    test("should fail when wallet attestation status indicates revoked", async () => {
        // Configure issuance with wallet attestation required
        const trustListUrl = "http://localhost:8787/wallet-providers-revoked";
        const statusListUrl = "http://localhost:8787/status-list-revoked";

        // First get current config to preserve other settings
        const currentConfig = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                ...currentConfig.body,
                walletAttestationRequired: true,
                walletProviderTrustLists: [trustListUrl],
            } as IssuanceDto)
            .expect(201);

        // Mock the trust list endpoint with revocation cert
        const trustListJwt = await createMockTrustListJwt(
            trustListSigningCert,
            walletProviderCert.certificate,
            "http://uri.etsi.org/19602/SvcType/WalletProvider",
            revocationCert.certificate,
        );

        nock("http://localhost:8787")
            .get("/wallet-providers-revoked")
            .reply(200, trustListJwt, {
                "Content-Type": "application/jwt",
            });

        // Mock the status list endpoint - index 5 is REVOKED (status = 1)
        const statusListJwt = await createStatusListJwt(
            revocationCert,
            statusListUrl,
            new Map([[5, 1]]), // Index 5 is revoked
        );

        nock("http://localhost:8787")
            .get("/status-list-revoked")
            .reply(200, statusListJwt, {
                "Content-Type": "application/statuslist+jwt",
            });

        // Create offer
        const offerResponse = await request(app.getHttpServer())
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["pid"],
                flow: "pre_authorized_code",
            })
            .expect(201);

        // Generate holder keys
        const holderKeyPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);
        holderPublicKeyJwk.alg = "ES256";
        holderPublicKeyJwk.use = "sig";

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });

        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );
        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        const authServerUrl =
            issuerMetadata.authorizationServers?.[0]?.issuer ||
            credentialOffer.credential_issuer;

        // Create wallet attestation with status claim pointing to REVOKED index
        const clientAttestationJwt = await createWalletAttestationJwt({
            walletProviderCert: walletProviderCert.certificate,
            walletProviderKey: walletProviderCert.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
            status: {
                status_list: {
                    idx: 5, // This index is revoked
                    uri: statusListUrl,
                },
            },
        });

        const clientAttestationPopJwt = await createWalletAttestationPopJwt({
            holderPrivateKey: holderKeyPair.privateKey,
            holderPublicKey: holderPublicKeyJwk as Jwk,
            authorizationServer: authServerUrl,
        });

        // Should fail - attestation status is revoked
        await expect(
            client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
                clientAttestation: {
                    clientAttestationJwt,
                    clientAttestationPopJwt,
                },
            }),
        ).rejects.toThrow();
    }, 30000);
});
