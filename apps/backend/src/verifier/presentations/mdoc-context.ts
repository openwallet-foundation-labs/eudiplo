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
import { X509Certificate } from "@peculiar/x509";
import { exportJWK, importX509 } from "jose";
import { toBuffer } from "../../shared/utils/buffer.util";

// Use global Web Crypto API (available in Node.js 19+)
const webCrypto = globalThis.crypto;

export const mdocContext: MdocContext = {
    crypto: {
        digest: async ({ digestAlgorithm, bytes }) => {
            const digest = await webCrypto.subtle.digest(
                digestAlgorithm,
                toBuffer(bytes),
            );
            return new Uint8Array(digest);
        },
        random: (length: number) => {
            return webCrypto.getRandomValues(new Uint8Array(length));
        },
        calculateEphemeralMacKey: async (input) => {
            const { privateKey, publicKey, sessionTranscriptBytes, info } =
                input;
            const ikm = p256
                .getSharedSecret(privateKey, publicKey, true)
                .slice(1);
            const salt = new Uint8Array(
                await webCrypto.subtle.digest(
                    "SHA-256",
                    toBuffer(sessionTranscriptBytes),
                ),
            );
            const infoAsBytes = stringToBytes(info);
            const digest = "sha256";
            const result = await hkdf(digest, ikm, salt, infoAsBytes, 32);

            return CoseKey.create({
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
                const { key, toBeAuthenticated } = input;
                return hmac(sha256, key.privateKey, toBeAuthenticated);
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
                const { key, toBeSigned } = input;
                return p256.sign(toBeSigned, key.privateKey, {
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
                const res = p256.verify(signature, toBeSigned, key.publicKey, {
                    lowS: false,
                });
                return res;
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

        // NOTE: Certificate chain validation is handled by CredentialChainValidationService
        // in the verifier layer (MdocverifierService). This method is kept as a no-op to satisfy
        // the MdocContext interface, but chain validation is disabled via disableCertificateChainValidation
        // option when calling Verifier.verifyDeviceResponse().
        verifyCertificateChain: async (_input: {
            trustedCertificates: Array<Uint8Array>;
            x5chain: Array<Uint8Array>;
            now?: Date;
        }) => {
            // No-op: chain validation is handled separately by CredentialChainValidationService
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
