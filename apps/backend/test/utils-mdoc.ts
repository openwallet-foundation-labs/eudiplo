import crypto from "node:crypto";
import {
    CoseKey,
    hex,
    KeyOps,
    KeyType,
    MacAlgorithm,
    type MdocContext,
    stringToBytes,
} from "@animo-id/mdoc";
import { p256 } from "@noble/curves/nist.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hkdf } from "@panva/hkdf";
import * as x509 from "@peculiar/x509";
import { X509Certificate } from "@peculiar/x509";
import { exportJWK, importX509 } from "jose";

export const DEVICE_JWK = {
    kty: "EC",
    x: "iBh5ynojixm_D0wfjADpouGbp6b3Pq6SuFHU3htQhVk",
    y: "oxS1OAORJ7XNUHNfVFGeM8E0RQVFxWA62fJj-sxW03c",
    crv: "P-256",
    d: "eRpAZr3eV5xMMnPG3kWjg90Y-bBff9LqmlQuk49HUtA",
};

export const ISSUER_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIICKjCCAdCgAwIBAgIUV8bM0wi95D7KN0TyqHE42ru4hOgwCgYIKoZIzj0EAwIw
UzELMAkGA1UEBhMCVVMxETAPBgNVBAgMCE5ldyBZb3JrMQ8wDQYDVQQHDAZBbGJh
bnkxDzANBgNVBAoMBk5ZIERNVjEPMA0GA1UECwwGTlkgRE1WMB4XDTIzMDkxNDE0
NTUxOFoXDTMzMDkxMTE0NTUxOFowUzELMAkGA1UEBhMCVVMxETAPBgNVBAgMCE5l
dyBZb3JrMQ8wDQYDVQQHDAZBbGJhbnkxDzANBgNVBAoMBk5ZIERNVjEPMA0GA1UE
CwwGTlkgRE1WMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiTwtg0eQbcbNabf2
Nq9L/VM/lhhPCq2s0Qgw2kRx29tgrBcNHPxTT64tnc1Ij3dH/fl42SXqMenpCDw4
K6ntU6OBgTB/MB0GA1UdDgQWBBSrbS4DuR1JIkAzj7zK3v2TM+r2xzAfBgNVHSME
GDAWgBSrbS4DuR1JIkAzj7zK3v2TM+r2xzAPBgNVHRMBAf8EBTADAQH/MCwGCWCG
SAGG+EIBDQQfFh1PcGVuU1NMIEdlbmVyYXRlZCBDZXJ0aWZpY2F0ZTAKBggqhkjO
PQQDAgNIADBFAiAJ/Qyrl7A+ePZOdNfc7ohmjEdqCvxaos6//gfTvncuqQIhANo4
q8mKCA9J8k/+zh//yKbN1bLAtdqPx7dnrDqV3Lg+
-----END CERTIFICATE-----`;

export const ISSUER_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCjo+vMGbV0J9LCokdb
oNWqYk4JBIgCiysI99sUkMw2ng==
-----END PRIVATE KEY-----`;

export const ISSUER_PRIVATE_KEY_JWK = {
    kty: "EC",
    kid: "1234",
    x: "iTwtg0eQbcbNabf2Nq9L_VM_lhhPCq2s0Qgw2kRx29s",
    y: "YKwXDRz8U0-uLZ3NSI93R_35eNkl6jHp6Qg8OCup7VM",
    crv: "P-256",
    d: "o6PrzBm1dCfSwqJHW6DVqmJOCQSIAosrCPfbFJDMNp4",
};

/**
 * Helper to convert Uint8Array<ArrayBufferLike> to Uint8Array<ArrayBuffer>
 * This is needed due to TypeScript version differences where newer TS versions
 * use Uint8Array<ArrayBufferLike> which is not assignable to BufferSource
 */
const toBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Uint8Array(bytes) as unknown as Uint8Array<ArrayBuffer>;
};

export const mdocContext: MdocContext = {
    crypto: {
        digest: async ({ digestAlgorithm, bytes }) => {
            const digest = await crypto.subtle.digest(
                digestAlgorithm,
                toBuffer(bytes),
            );
            return new Uint8Array(digest);
        },
        random: (length: number) => {
            return crypto.getRandomValues(new Uint8Array(length));
        },
        calculateEphemeralMacKey: async (input) => {
            const { privateKey, publicKey, sessionTranscriptBytes, info } =
                input;
            const ikm = p256
                .getSharedSecret(privateKey, publicKey, true)
                .slice(1);
            const salt = new Uint8Array(
                await crypto.subtle.digest(
                    "SHA-256",
                    toBuffer(sessionTranscriptBytes),
                ),
            );
            const infoAsBytes = stringToBytes(info);
            const digest = "sha256";
            const result = await hkdf(digest, ikm, salt, infoAsBytes, 32);

            return new CoseKey({
                keyOps: [KeyOps.Sign, KeyOps.Verify],
                keyType: KeyType.Oct,
                k: result,
                algorithm: MacAlgorithm.HS256,
            });
        },
    },

    cose: {
        mac0: {
            sign: (input) => {
                const { key, mac0 } = input;
                return hmac(sha256, key.privateKey, mac0.toBeAuthenticated);
            },
            verify: (input) => {
                const { mac0, key } = input;

                if (!mac0.tag) {
                    throw new Error("tag is required for mac0 verification");
                }

                return (
                    mac0.tag ===
                    hmac(sha256, key.privateKey, mac0.toBeAuthenticated)
                );
            },
        },
        sign1: {
            sign: (input) => {
                const { key, sign1 } = input;
                return p256.sign(sign1.toBeSigned, key.privateKey, {
                    format: "compact",
                });
            },
            verify: (input) => {
                const { sign1, key } = input;
                const { toBeSigned, signature } = sign1;

                if (!signature) {
                    throw new Error(
                        "signature is required for sign1 verification",
                    );
                }

                // lowS is needed after upgrade of @noble/curves to keep existing tests passing
                return p256.verify(signature, toBeSigned, key.publicKey, {
                    lowS: false,
                });
            },
        },
    },

    x509: {
        getIssuerNameField: (input: {
            certificate: Uint8Array;
            field: string;
        }) => {
            const certificate = new X509Certificate(
                toBuffer(input.certificate),
            );
            return certificate.issuerName.getField(input.field);
        },
        getPublicKey: async (input: {
            certificate: Uint8Array;
            alg: string;
        }) => {
            const certificate = new X509Certificate(
                toBuffer(input.certificate),
            );

            const key = await importX509(certificate.toString(), input.alg, {
                extractable: true,
            });

            return CoseKey.fromJwk(
                (await exportJWK(key)) as unknown as Record<string, unknown>,
            );
        },

        verifyCertificateChain: async (input: {
            trustedCertificates: Array<Uint8Array>;
            x5chain: Array<Uint8Array>;
            now?: Date;
        }) => {
            const { trustedCertificates, x5chain: certificateChain } = input;
            if (certificateChain.length === 0)
                throw new Error("Certificate chain is empty");

            const parsedLeafCertificate = new x509.X509Certificate(
                toBuffer(certificateChain[0]),
            );

            const parsedCertificates = certificateChain.map(
                (c) => new x509.X509Certificate(toBuffer(c)),
            );

            const certificateChainBuilder = new x509.X509ChainBuilder({
                certificates: parsedCertificates,
            });

            const chain = await certificateChainBuilder.build(
                parsedLeafCertificate,
            );

            // The chain is reversed here as the `x5c` header (the expected input),
            // has the leaf certificate as the first entry, while the `x509` library expects this as the last
            let parsedChain = chain
                .map((c) => new x509.X509Certificate(c.rawData))
                .reverse();

            if (parsedChain.length !== certificateChain.length) {
                throw new Error(
                    "Could not parse the full chain. Likely due to incorrect ordering",
                );
            }

            const parsedTrustedCertificates = trustedCertificates.map(
                (trustedCertificate) =>
                    new x509.X509Certificate(toBuffer(trustedCertificate)),
            );

            const trustedCertificateIndex = parsedChain.findIndex((cert) =>
                parsedTrustedCertificates.some((tCert) => cert.equal(tCert)),
            );

            if (trustedCertificateIndex === -1) {
                throw new Error(
                    "No trusted certificate was found while validating the X.509 chain",
                );
            }

            // Pop everything off above the index of the trusted as it is not relevant for validation
            parsedChain = parsedChain.slice(0, trustedCertificateIndex);

            // Verify the certificate with the publicKey of the certificate above
            for (let i = 0; i < parsedChain.length; i++) {
                const cert = parsedChain[i];
                const previousCertificate = parsedChain[i - 1];
                const publicKey = previousCertificate
                    ? previousCertificate.publicKey
                    : undefined;
                await cert?.verify({
                    publicKey,
                    date: input.now ?? new Date(),
                });
            }
        },
        getCertificateData: async (input: { certificate: Uint8Array }) => {
            const certificate = new X509Certificate(
                toBuffer(input.certificate),
            );
            const thumbprint = await certificate.getThumbprint();
            const thumbprintHex = hex.encode(new Uint8Array(thumbprint));
            return {
                issuerName: certificate.issuerName.toString(),
                subjectName: certificate.subjectName.toString(),
                pem: certificate.toString(),
                serialNumber: certificate.serialNumber,
                thumbprint: thumbprintHex,
                notBefore: certificate.notBefore,
                notAfter: certificate.notAfter,
            };
        },
    },
};
