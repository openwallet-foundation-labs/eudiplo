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

async function asyncSome<T>(
    array: T[],
    predicate: (item: T) => Promise<boolean>,
): Promise<boolean> {
    for (const item of array) {
        if (await predicate(item)) return true;
    }
    return false;
}

export const mdocContext: MdocContext = {
    crypto: {
        digest: async ({ digestAlgorithm, bytes }) => {
            const digest = await crypto.subtle.digest(
                digestAlgorithm,
                new Int8Array(bytes),
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
                .getSharedSecret(
                    hex.encode(privateKey),
                    hex.encode(publicKey),
                    true,
                )
                .slice(1);
            const salt = new Uint8Array(
                await crypto.subtle.digest(
                    "SHA-256",
                    new Int8Array(sessionTranscriptBytes),
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

                const hashed = sha256(sign1.toBeSigned);
                const sig = p256.sign(hashed, key.privateKey);

                return sig.toCompactRawBytes();
            },
            verify: (input) => {
                const { sign1, key } = input;
                const { toBeSigned, signature } = sign1;

                if (!signature) {
                    throw new Error(
                        "signature is required for sign1 verification",
                    );
                }

                const hashed = sha256(toBeSigned);
                return p256.verify(signature, hashed, key.publicKey);
            },
        },
    },

    x509: {
        getIssuerNameField: (input: {
            certificate: Uint8Array;
            field: string;
        }) => {
            const certificate = new X509Certificate(
                new Int8Array(input.certificate),
            );
            return certificate.issuerName.getField(input.field);
        },
        getPublicKey: async (input: {
            certificate: Uint8Array;
            alg: string;
        }) => {
            const certificate = new X509Certificate(
                new Int8Array(input.certificate),
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
        }) => {
            const { trustedCertificates, x5chain: certificateChain } = input;
            if (certificateChain.length === 0)
                throw new Error("Certificate chain is empty");

            const parsedCertificates = certificateChain.map(
                (c) => new x509.X509Certificate(new Uint8Array(c)),
            );

            const parsedTrustedCertificates = trustedCertificates.map(
                (trustedCertificate) =>
                    new x509.X509Certificate(
                        new Uint8Array(trustedCertificate),
                    ),
            );

            const parsedLeafCertificate = parsedCertificates[0];

            // ✅ trusted certificates도 체인 빌드에 포함
            const certificateChainBuilder = new x509.X509ChainBuilder({
                certificates: [
                    ...parsedCertificates,
                    ...parsedTrustedCertificates,
                ],
            });

            const chain = await certificateChainBuilder.build(
                parsedLeafCertificate,
            );

            // x5c: [Leaf, Intermediate, Root]
            // chain.build 결과: [Leaf, Intermediate, Root] (leaf first)
            const parsedChain = chain.map(
                (c) => new x509.X509Certificate(c.rawData),
            );

            // ✅ 체인의 마지막(Root)이 trusted certificate인지 확인
            const rootCert = parsedChain[parsedChain.length - 1];
            const isTrusted = await asyncSome(
                parsedTrustedCertificates,
                async (tCert) => {
                    const publicKey = tCert.publicKey;
                    if (rootCert.equal(tCert)) return true;
                    try {
                        await rootCert.verify({
                            publicKey: publicKey,
                            date: new Date(),
                        });
                        return true;
                    } catch {
                        return false;
                    }
                },
            );

            if (!isTrusted) {
                throw new Error(
                    "No trusted certificate was found while validating the X.509 chain",
                );
            }

            // ✅ 체인 검증: 각 인증서가 다음 인증서(issuer)에 의해 서명되었는지 확인
            // parsedChain: [Leaf, Intermediate, Root]
            for (let i = 0; i < parsedChain.length - 1; i++) {
                const cert = parsedChain[i];
                const issuerCert = parsedChain[i + 1];
                await cert.verify({
                    publicKey: issuerCert.publicKey,
                    date: new Date(),
                });
            }

            // Root CA는 self-signed이므로 자체 검증 (선택적)
            const rootCertFinal = parsedChain[parsedChain.length - 1];
            await rootCertFinal.verify({
                publicKey: rootCertFinal.publicKey,
                date: new Date(),
            });
        },
        getCertificateData: async (input: { certificate: Uint8Array }) => {
            const certificate = new X509Certificate(
                new Uint8Array(input.certificate),
            );
            const thumbprint = await certificate.getThumbprint(crypto);
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
