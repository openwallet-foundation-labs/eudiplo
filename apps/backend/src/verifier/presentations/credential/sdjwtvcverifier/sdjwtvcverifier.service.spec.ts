import { BadRequestException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { ResolverService } from "../../../resolver/resolver.service";
import { CredentialChainValidationService } from "../credential-chain-validation.service";
import { SdjwtvcverifierService } from "./sdjwtvcverifier.service";

describe("SdjwtvcverifierService", () => {
    let service: SdjwtvcverifierService;
    let mockResolverService: {
        resolvePublicKey: ReturnType<typeof vi.fn>;
    };
    let mockCryptoService: {
        getCryptoFromJwk: ReturnType<typeof vi.fn>;
    };
    let mockChainValidation: {
        validateChain: ReturnType<typeof vi.fn>;
        verifyStatusListSignature: ReturnType<typeof vi.fn>;
        fetchStatusListJwt: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        mockResolverService = {
            resolvePublicKey: vi.fn(),
        };
        mockCryptoService = {
            getCryptoFromJwk: vi.fn(),
        };
        mockChainValidation = {
            validateChain: vi.fn(),
            verifyStatusListSignature: vi.fn(),
            fetchStatusListJwt: vi.fn(),
        };

        service = new SdjwtvcverifierService(
            mockResolverService as unknown as ResolverService,
            mockCryptoService as unknown as CryptoImplementationService,
            mockChainValidation as unknown as CredentialChainValidationService,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("validateTransactionDataHashes", () => {
        // Access the private method for testing
        const callValidateTransactionDataHashes = (
            svc: SdjwtvcverifierService,
            result: any,
            transactionData: string[],
        ) => {
            return (svc as any).validateTransactionDataHashes(
                result,
                transactionData,
            );
        };

        it("should throw if KB-JWT is missing", () => {
            const result = { kb: undefined };

            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow(BadRequestException);
            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow("Transaction data was provided but KB-JWT is missing");
        });

        it("should throw if transaction_data_hashes is missing in KB-JWT", () => {
            const result = {
                kb: {
                    payload: {},
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow(BadRequestException);
            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow(
                "Transaction data was provided but KB-JWT does not contain transaction_data_hashes",
            );
        });

        it("should throw if hash count mismatch", () => {
            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: ["hash1"],
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "data1",
                    "data2",
                ]),
            ).toThrow(BadRequestException);
            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "data1",
                    "data2",
                ]),
            ).toThrow("Transaction data hash count mismatch");
        });

        it("should throw on unsupported hash algorithm", () => {
            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: ["hash1"],
                        transaction_data_hashes_alg: "md5",
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow(BadRequestException);
            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow("Unsupported transaction_data_hashes_alg: md5");
        });

        it("should throw on hash mismatch", () => {
            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: ["wronghash"],
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow(BadRequestException);
            expect(() =>
                callValidateTransactionDataHashes(service, result, ["data1"]),
            ).toThrow("Transaction data hash mismatch at index 0");
        });

        it("should pass when hashes match with default sha-256", () => {
            // Pre-compute the expected hash for "testdata"
            const crypto = require("node:crypto");
            const { base64url } = require("jose");
            const expectedHash = base64url.encode(
                crypto.createHash("sha256").update("testdata").digest(),
            );

            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: [expectedHash],
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "testdata",
                ]),
            ).not.toThrow();
        });

        it("should pass when hashes match with explicit sha-256", () => {
            const crypto = require("node:crypto");
            const { base64url } = require("jose");
            const expectedHash = base64url.encode(
                crypto.createHash("sha256").update("testdata").digest(),
            );

            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: [expectedHash],
                        transaction_data_hashes_alg: "sha-256",
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "testdata",
                ]),
            ).not.toThrow();
        });

        it("should support sha-384 algorithm", () => {
            const crypto = require("node:crypto");
            const { base64url } = require("jose");
            const expectedHash = base64url.encode(
                crypto.createHash("sha384").update("testdata").digest(),
            );

            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: [expectedHash],
                        transaction_data_hashes_alg: "sha-384",
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "testdata",
                ]),
            ).not.toThrow();
        });

        it("should support sha-512 algorithm", () => {
            const crypto = require("node:crypto");
            const { base64url } = require("jose");
            const expectedHash = base64url.encode(
                crypto.createHash("sha512").update("testdata").digest(),
            );

            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: [expectedHash],
                        transaction_data_hashes_alg: "sha-512",
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "testdata",
                ]),
            ).not.toThrow();
        });

        it("should validate multiple transaction data entries", () => {
            const crypto = require("node:crypto");
            const { base64url } = require("jose");
            const hash1 = base64url.encode(
                crypto.createHash("sha256").update("data1").digest(),
            );
            const hash2 = base64url.encode(
                crypto.createHash("sha256").update("data2").digest(),
            );

            const result = {
                kb: {
                    payload: {
                        transaction_data_hashes: [hash1, hash2],
                    },
                },
            };

            expect(() =>
                callValidateTransactionDataHashes(service, result, [
                    "data1",
                    "data2",
                ]),
            ).not.toThrow();
        });
    });

    describe("kbVerifier", () => {
        const callKbVerifier = async (
            svc: SdjwtvcverifierService,
            data: string,
            signature: string,
            payload: any,
        ) => {
            return (svc as any).kbVerifier(data, signature, payload);
        };

        it("should throw if cnf is missing in payload", async () => {
            const payload = {};

            await expect(
                callKbVerifier(service, "data", "sig", payload),
            ).rejects.toThrow("No cnf found in the payload");
        });

        it("should verify signature with jwk from cnf", async () => {
            const mockVerifier = vi.fn().mockResolvedValue(true);
            const mockCrypto = {
                getVerifier: vi.fn().mockResolvedValue(mockVerifier),
            };
            mockCryptoService.getCryptoFromJwk.mockReturnValue(mockCrypto);

            const payload = {
                cnf: {
                    jwk: {
                        kty: "EC",
                        crv: "P-256",
                        x: "test-x",
                        y: "test-y",
                    },
                },
            };

            const result = await callKbVerifier(
                service,
                "testdata",
                "testsig",
                payload,
            );

            expect(result).toBe(true);
            expect(mockCryptoService.getCryptoFromJwk).toHaveBeenCalledWith(
                payload.cnf.jwk,
            );
            expect(mockCrypto.getVerifier).toHaveBeenCalledWith(
                payload.cnf.jwk,
            );
            expect(mockVerifier).toHaveBeenCalledWith("testdata", "testsig");
        });
    });
});
