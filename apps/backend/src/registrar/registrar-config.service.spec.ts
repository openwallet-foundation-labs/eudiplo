import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity.js";
import { RegistrarConfigService } from "./registrar-config.service.js";
import type { CreateRegistrarConfig } from "./schemas/registrar.schema.js";

const stored = {
    tenantId: "tenant",
    registrarUrl: "https://registrar.example/api",
    oidcUrl: "https://auth.example/realms/registrar",
    clientId: "client",
    clientSecret: "stored-secret",
    username: "user",
    password: "stored-password",
} as RegistrarConfigEntity;

const dto: CreateRegistrarConfig = {
    registrarUrl: "https://registrar.example/api",
    oidcUrl: "https://auth.example/realms/registrar",
    clientId: "client",
    username: "user",
    password: "password",
};

describe("RegistrarConfigService", () => {
    let repository: {
        findOneBy: ReturnType<typeof vi.fn>;
        findOneByOrFail: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
    };
    let authService: {
        testCredentials: ReturnType<typeof vi.fn>;
        invalidateToken: ReturnType<typeof vi.fn>;
    };
    let service: RegistrarConfigService;

    function storedConfig(overrides: Partial<RegistrarConfigEntity> = {}) {
        repository.findOneBy.mockResolvedValue({ ...stored, ...overrides });
    }

    beforeEach(() => {
        repository = {
            findOneBy: vi.fn(),
            findOneByOrFail: vi.fn(),
            save: vi.fn(async (entity) => entity),
        };
        authService = {
            testCredentials: vi.fn().mockResolvedValue(undefined),
            invalidateToken: vi.fn(),
        };
        service = new RegistrarConfigService(
            {} as any,
            { register: vi.fn() } as any,
            repository as any,
            authService as any,
            {} as any,
            {} as any,
            {} as any,
        );
        storedConfig();
    });

    describe("updateConfig", () => {
        it("rejects a new oidcUrl without the credentials and sends nothing", async () => {
            await expect(
                service.updateConfig("tenant", {
                    oidcUrl: "https://attacker.example/realms/x",
                }),
            ).rejects.toThrow(
                new BadRequestException(
                    "oidcUrl changes; send password and clientSecret again, a stored credential is not sent to a new address",
                ),
            );
            expect(authService.testCredentials).not.toHaveBeenCalled();
            expect(repository.save).not.toHaveBeenCalled();
        });

        it("rejects a new registrarUrl without the credentials", async () => {
            await expect(
                service.updateConfig("tenant", {
                    registrarUrl: "https://attacker.example/api",
                }),
            ).rejects.toThrow(BadRequestException);
            expect(authService.testCredentials).not.toHaveBeenCalled();
            expect(repository.save).not.toHaveBeenCalled();
        });

        it("rejects a new oidcUrl with a password while a client secret is stored", async () => {
            await expect(
                service.updateConfig("tenant", {
                    oidcUrl: "https://auth.other.example/realms/x",
                    password: "new-password",
                }),
            ).rejects.toThrow(
                new BadRequestException(
                    "oidcUrl changes; send clientSecret again, a stored credential is not sent to a new address",
                ),
            );
            expect(authService.testCredentials).not.toHaveBeenCalled();
        });

        it("tests and saves a new oidcUrl with the credentials sent again", async () => {
            const dto = {
                oidcUrl: "https://auth.other.example/realms/x",
                registrarUrl: "https://registrar.other.example/api",
                password: "new-password",
                clientSecret: "new-secret",
            };

            await service.updateConfig("tenant", dto);

            expect(authService.testCredentials).toHaveBeenCalledWith(
                expect.objectContaining(dto),
            );
            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining(dto),
            );
        });

        it("needs no client secret for a new oidcUrl when none is stored", async () => {
            storedConfig({ clientSecret: null });

            await service.updateConfig("tenant", {
                oidcUrl: "https://auth.other.example/realms/x",
                password: "new-password",
            });

            expect(authService.testCredentials).toHaveBeenCalledWith(
                expect.objectContaining({
                    oidcUrl: "https://auth.other.example/realms/x",
                    password: "new-password",
                    clientSecret: null,
                }),
            );
        });

        it("keeps the stored credentials when the URLs are sent unchanged", async () => {
            await service.updateConfig("tenant", {
                registrarUrl: stored.registrarUrl,
                oidcUrl: stored.oidcUrl,
                username: "other-user",
            });

            expect(authService.testCredentials).toHaveBeenCalledWith(
                expect.objectContaining({
                    oidcUrl: stored.oidcUrl,
                    username: "other-user",
                    password: "stored-password",
                    clientSecret: "stored-secret",
                }),
            );
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe("saveConfig", () => {
        it("saves clientSecret null when the replacement leaves it out", async () => {
            await service.saveConfig("tenant", {
                registrarUrl: stored.registrarUrl,
                oidcUrl: "https://auth.other.example/realms/x",
                clientId: "client",
                username: "user",
                password: "new-password",
            });

            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({ clientSecret: null }),
            );
        });

        it("stores the client secret of the replacement", async () => {
            await service.saveConfig("tenant", {
                registrarUrl: stored.registrarUrl,
                oidcUrl: stored.oidcUrl,
                clientId: "client",
                clientSecret: "new-secret",
                username: "user",
                password: "new-password",
            });

            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({ clientSecret: "new-secret" }),
            );
        });

        it("does not save when the registrar rejects the credentials", async () => {
            authService.testCredentials.mockRejectedValue(
                new BadRequestException("Invalid registrar credentials"),
            );

            await expect(service.saveConfig("tenant", dto)).rejects.toThrow(
                BadRequestException,
            );
            expect(authService.testCredentials).toHaveBeenCalledWith(dto);
            expect(repository.save).not.toHaveBeenCalled();
            expect(authService.invalidateToken).not.toHaveBeenCalled();
        });

        it("replaces the configuration once the credentials are accepted", async () => {
            await service.saveConfig("tenant", dto);

            expect(repository.save).toHaveBeenCalledWith({
                tenantId: "tenant",
                ...dto,
                clientSecret: null,
                registrationCertificateDefaults: null,
            });
        });
    });

    describe("replaceConfig", () => {
        it("saves clientSecret and registrationCertificateDefaults null when the replacement leaves them out", async () => {
            await service.replaceConfig("tenant", dto);

            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    clientSecret: null,
                    registrationCertificateDefaults: null,
                }),
            );
        });

        it("stores the clientSecret and registrationCertificateDefaults of the replacement", async () => {
            const defaults = { privacy_policy: "https://rp.example/privacy" };

            await service.replaceConfig("tenant", {
                ...dto,
                clientSecret: "secret",
                registrationCertificateDefaults: defaults,
            });

            expect(repository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    clientSecret: "secret",
                    registrationCertificateDefaults: defaults,
                }),
            );
        });

        it("saves without contacting the registrar", async () => {
            await service.replaceConfig("tenant", dto);

            expect(authService.testCredentials).not.toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalled();
            expect(authService.invalidateToken).toHaveBeenCalledWith("tenant");
        });
    });
});
