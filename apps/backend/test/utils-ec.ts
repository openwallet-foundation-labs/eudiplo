import {
    KeyObject,
    verify as verifySignature,
    webcrypto,
    X509Certificate,
} from "node:crypto";
import { resolve } from "node:path";
import { INestApplication } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { decodeProtectedHeader, importX509, type JWK, jwtVerify } from "jose";
import request from "supertest";
import { expect } from "vitest";
import {
    type KmsSigningAlg,
    signingAlgSpec,
} from "../src/crypto/key/domain/signing-algs.js";
import { KeyChainType } from "../src/crypto/key/dto/key-chain-create.dto.js";
import { KeyUsageType } from "../src/crypto/key/types/key-usage-type.js";
import { CredentialConfigCreate } from "../src/issuer/configuration/credentials/dto/credential-config-create.dto.js";
import { readConfig } from "./utils.js";

/*
 * Helpers for the ES384 / ES512 end-to-end tests. Signatures are checked with
 * node:crypto, not with @peculiar/x509, because the backend replaces the
 * global @peculiar/x509 crypto provider with its KMS provider.
 */

/** COSE header parameter `alg` (RFC 9052 §3.1). */
const COSE_HEADER_ALG = 1;

/** Creates a key chain through POST /key-chain and returns its id. */
export async function createKeyChain(
    app: INestApplication,
    authToken: string,
    body: {
        usageType: KeyUsageType;
        alg?: KmsSigningAlg;
        type?: KeyChainType;
        kmsProvider?: string;
        description?: string;
    },
): Promise<string> {
    const response = await request(app.getHttpServer())
        .post("/key-chain")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ type: KeyChainType.Standalone, ...body })
        .expect(201);
    return response.body.id;
}

/**
 * Deletes a key chain, so that it does not become the default key chain of
 * its usage type for later tests of the suite.
 */
export async function deleteKeyChain(
    app: INestApplication,
    authToken: string,
    keyChainId: string,
): Promise<void> {
    await request(app.getHttpServer())
        .delete(`/key-chain/${keyChainId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);
}

/**
 * Creates a copy of a credential configuration fixture from
 * `fixtures/haip/issuance/credentials` under a new id, signed by another
 * key chain. Returns a function that deletes it again.
 */
export async function createCredentialConfigCopy(
    app: INestApplication,
    authToken: string,
    fixture: string,
    copy: { id: string; keyChainId: string },
): Promise<() => Promise<void>> {
    const config = readConfig<CredentialConfigCreate>(
        resolve(
            __dirname,
            "fixtures/haip/issuance/credentials",
            `${fixture}.json`,
        ),
    );
    await request(app.getHttpServer())
        .post("/issuer/credentials")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send({ ...config, ...copy })
        .expect(201);
    return async () => {
        await request(app.getHttpServer())
            .delete(`/issuer/credentials/${copy.id}`)
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`);
    };
}

/** The issuer metadata entry of a credential configuration of tenant root. */
export async function credentialConfigurationMetadata(
    app: INestApplication,
    credentialConfigurationId: string,
): Promise<Record<string, any>> {
    const response = await request(app.getHttpServer())
        .get("/.well-known/openid-credential-issuer/issuers/root")
        .trustLocalhost()
        .set("Accept", "application/json")
        .expect(200);
    return response.body.credential_configurations_supported[
        credentialConfigurationId
    ];
}

/** The certificates of a PEM chain as base64 DER values, as `x5c` carries them. */
export function pemChainToX5c(pemChain: string): string[] {
    return (
        pemChain.match(
            /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
        ) ?? []
    ).map((pem) =>
        pem
            .replace("-----BEGIN CERTIFICATE-----", "")
            .replace("-----END CERTIFICATE-----", "")
            .replaceAll(/\s/g, ""),
    );
}

function derToPem(base64Der: string): string {
    const lines = base64Der.match(/.{1,64}/g)!.join("\n");
    return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
}

/**
 * Asserts that a compact JWS names `alg`, carries an x5c header and verifies
 * against its leaf certificate, whose key is on the curve of `alg`.
 * Returns the verified payload.
 */
export async function expectJwsSignedWithX5c(
    jws: string,
    alg: KmsSigningAlg,
): Promise<Record<string, unknown>> {
    const header = decodeProtectedHeader(jws);
    expect(header.alg).toBe(alg);
    const x5c = header.x5c as string[] | undefined;
    expect(x5c?.length).toBeGreaterThanOrEqual(1);

    const leafPem = derToPem(x5c![0]);
    expectCertificateKeyCurve(leafPem, alg);
    const key = await importX509(leafPem, alg);
    const { payload } = await jwtVerify(jws, key, { algorithms: [alg] });
    return payload;
}

/** The subset of a decoded @owf/cose `Sign1` the COSE checks need. */
interface DecodedSign1 {
    protectedHeaders: { headers: { get(label: number): unknown } };
    signature: Uint8Array;
    certificate: Uint8Array;
    toBeSigned(): Uint8Array;
}

/**
 * Asserts that a COSE_Sign1 has the classic COSE algorithm of `alg` in its
 * protected header and verifies against the leaf of its x5chain.
 */
export function expectCoseSign1SignedWithX5chain(
    sign1: DecodedSign1,
    alg: KmsSigningAlg,
): void {
    const spec = signingAlgSpec(alg);
    expect(sign1.protectedHeaders.headers.get(COSE_HEADER_ALG)).toBe(
        spec.coseAlg,
    );
    // COSE carries the raw r || s, two coordinates long.
    expect(sign1.signature).toHaveLength(spec.coordinateSize * 2);

    const leaf = new X509Certificate(Buffer.from(sign1.certificate));
    expectCertificateKeyCurve(leaf, alg);
    expect(
        verifySignature(
            spec.nodeHash,
            sign1.toBeSigned(),
            { key: leaf.publicKey, dsaEncoding: "ieee-p1363" },
            sign1.signature,
        ),
    ).toBe(true);
}

/** Asserts that the certificate's public key is on the curve of `alg`. */
function expectCertificateKeyCurve(
    certificate: string | X509Certificate,
    alg: KmsSigningAlg,
): void {
    const cert =
        typeof certificate === "string"
            ? new X509Certificate(certificate)
            : certificate;
    expect(cert.publicKey.export({ format: "jwk" }).crv).toBe(
        signingAlgSpec(alg).crv,
    );
}

/**
 * Asserts that `certificatePem` is signed by the key of `issuerPem`
 * (itself when omitted) and holds a key on the curve of `alg`.
 */
export function expectCertificateSignedBy(
    certificatePem: string,
    alg: KmsSigningAlg,
    issuerPem: string = certificatePem,
): void {
    const cert = new X509Certificate(certificatePem);
    expectCertificateKeyCurve(cert, alg);
    expect(cert.verify(new X509Certificate(issuerPem).publicKey)).toBe(true);
}

/**
 * A self-signed CA certificate on the curve of `alg`, with its private key
 * as JWK and PKCS#8 PEM.
 */
export async function createSelfSignedCa(
    alg: KmsSigningAlg,
    commonName = `${alg} Test Root`,
): Promise<{ certificatePem: string; privateJwk: JWK; privateKeyPem: string }> {
    const { crv, hash } = signingAlgSpec(alg);
    const keys = (await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: crv },
        true,
        ["sign", "verify"],
    )) as CryptoKeyPair;
    const notBefore = new Date(Date.now() - 60_000);
    const certificate = await x509.X509CertificateGenerator.createSelfSigned(
        {
            serialNumber: "01",
            name: `CN=${commonName}`,
            notBefore,
            notAfter: new Date(notBefore.getTime() + 365 * 86_400_000),
            keys,
            signingAlgorithm: { name: "ECDSA", hash },
            extensions: [
                new x509.BasicConstraintsExtension(true, undefined, true),
                new x509.KeyUsagesExtension(
                    x509.KeyUsageFlags.keyCertSign |
                        x509.KeyUsageFlags.cRLSign |
                        x509.KeyUsageFlags.digitalSignature,
                    true,
                ),
            ],
        },
        // The backend replaces the global @peculiar/x509 crypto provider.
        webcrypto as Crypto,
    );
    const privateKey = KeyObject.from(keys.privateKey);
    return {
        certificatePem: certificate.toString("pem"),
        privateJwk: privateKey.export({ format: "jwk" }) as JWK,
        privateKeyPem: privateKey
            .export({ type: "pkcs8", format: "pem" })
            .toString(),
    };
}
