import { hkdfSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EncryptionService } from "./encryption.service";
import { EncryptionKeyProvider } from "./providers/encryption-key-provider.interface";

describe("EncryptionService", () => {
    let service: EncryptionService;

    // Create a mock key (32 bytes derived from test secret)
    const mockKey = Buffer.from(
        hkdfSync(
            "sha256",
            "test-jwt-secret-minimum-32-characters-long",
            "",
            "eudiplo-encryption-at-rest",
            32,
        ),
    );

    const mockKeyProvider: EncryptionKeyProvider = {
        name: "test",
        getKey: vi.fn().mockResolvedValue(mockKey),
    };

    beforeEach(async () => {
        service = new EncryptionService(mockKeyProvider);
        await service.initialize();
    });

    describe("encrypt/decrypt string", () => {
        it("should encrypt and decrypt a string", () => {
            const plaintext = "Hello, World!";
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(encrypted).not.toBe(plaintext);
            expect(decrypted).toBe(plaintext);
        });

        it("should produce different ciphertext for same plaintext (due to random IV)", () => {
            const plaintext = "Test data";
            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it("should use format iv:authTag:ciphertext", () => {
            const encrypted = service.encrypt("test");
            const parts = encrypted.split(":");

            expect(parts).toHaveLength(3);
            // All parts should be base64
            parts.forEach((part) => {
                expect(() => Buffer.from(part, "base64")).not.toThrow();
            });
        });
    });

    describe("encrypt/decrypt JSON", () => {
        it("should encrypt and decrypt JSON objects", () => {
            const data = { name: "John", age: 30, nested: { value: "test" } };
            const encrypted = service.encryptJson(data);
            const decrypted = service.decryptJson(encrypted);

            expect(decrypted).toEqual(data);
        });

        it("should handle arrays", () => {
            const data = [1, 2, { key: "value" }];
            const encrypted = service.encryptJson(data);
            const decrypted = service.decryptJson(encrypted);

            expect(decrypted).toEqual(data);
        });
    });

    describe("isEncrypted", () => {
        it("should return true for encrypted values", () => {
            const encrypted = service.encrypt("test");
            expect(service.isEncrypted(encrypted)).toBe(true);
        });

        it("should return false for plain JSON", () => {
            expect(service.isEncrypted('{"key": "value"}')).toBe(false);
        });

        it("should return false for plain strings", () => {
            expect(service.isEncrypted("hello world")).toBe(false);
        });

        it("should return false for non-strings", () => {
            expect(service.isEncrypted(null as unknown as string)).toBe(false);
            expect(service.isEncrypted(123 as unknown as string)).toBe(false);
        });
    });

    describe("error handling", () => {
        it("should throw on invalid encrypted format", () => {
            expect(() => service.decrypt("invalid")).toThrow(
                "Invalid encrypted value format",
            );
        });

        it("should throw on tampered data (authentication failure)", () => {
            const encrypted = service.encrypt("test");
            const parts = encrypted.split(":");
            // Tamper with the ciphertext
            parts[2] = Buffer.from("tampered").toString("base64");
            const tampered = parts.join(":");

            expect(() => service.decrypt(tampered)).toThrow();
        });
    });

    describe("initialization", () => {
        it("should require initialization before encrypt/decrypt", () => {
            const uninitializedService = new EncryptionService(mockKeyProvider);

            expect(() => uninitializedService.encrypt("test")).toThrow(
                "Encryption service not initialized",
            );
        });

        it("should call key provider getKey on initialize", async () => {
            const spyProvider: EncryptionKeyProvider = {
                name: "spy",
                getKey: vi.fn().mockResolvedValue(mockKey),
            };
            const testService = new EncryptionService(spyProvider);

            await testService.initialize();

            expect(spyProvider.getKey).toHaveBeenCalledTimes(1);
        });

        it("should only initialize once", async () => {
            const spyProvider: EncryptionKeyProvider = {
                name: "spy",
                getKey: vi.fn().mockResolvedValue(mockKey),
            };
            const testService = new EncryptionService(spyProvider);

            await testService.initialize();
            await testService.initialize(); // second call

            expect(spyProvider.getKey).toHaveBeenCalledTimes(1);
        });
    });
});
