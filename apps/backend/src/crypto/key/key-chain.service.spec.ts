import type { ExecutionContext } from "@nestjs/common";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { Role } from "../../auth/roles/role.enum.js";
import { RolesGuard } from "../../auth/roles/roles.guard.js";
import type { TokenPayload } from "../../auth/token.decorator.js";
import { KeyChainEntity, KeyUsage } from "./entities/key-chain.entity.js";
import { KeyChainController } from "./key-chain.controller.js";
import { KeyChainService } from "./key-chain.service.js";
import { KeyChainImportSchema } from "./schemas/key-chain.schema.js";
import { KeyUsageType } from "./types/key-usage-type.js";

const privateJwk = {
    kty: "EC",
    crv: "P-256",
    x: "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
    y: "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
    d: "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
    kid: "key-active",
    alg: "ES256",
};

const rootJwk = { ...privateJwk, kid: "key-root" };

function keyChain(overrides: Partial<KeyChainEntity>): KeyChainEntity {
    return Object.assign(new KeyChainEntity(), {
        id: "key",
        tenantId: "tenant",
        usageType: KeyUsageType.Attestation,
        kmsProvider: "db",
        activeJwk: privateJwk,
        activeCertificate: "",
        rotationEnabled: false,
        ...overrides,
    });
}

function serviceFor(entity: KeyChainEntity, providerType: string) {
    const service = Object.create(KeyChainService.prototype) as any;
    service.keyChainRepository = {
        findOne: vi.fn().mockResolvedValue(entity),
    };
    service.kmsRegistry = { resolve: () => ({ type: providerType }) };
    service.certBuilder = { splitPemChain: (pem: string) => [pem] };
    return service as KeyChainService;
}

describe("KeyChainService.export", () => {
    it("exports the private key of a database-held key chain", async () => {
        const service = serviceFor(keyChain({}), "db");

        const exported = await service.export("tenant", "key");

        expect(exported.key.d).toBe(privateJwk.d);
    });

    it("never exports private material of an external KMS key chain", async () => {
        // The entity only stores the public JWK for external providers; a
        // private component must still never be returned if one is present.
        const service = serviceFor(
            keyChain({
                kmsProvider: "vault",
                externalKeyId: "vault-key",
                activeJwk: privateJwk,
            }),
            "vault",
        );

        const exported = await service.export("tenant", "key");

        expect(exported.key).not.toHaveProperty("d");
        expect(exported.key.x).toBe(privateJwk.x);
        expect(exported.kmsProvider).toBe("vault");
    });

    it("strips private material when the provider is not a database provider", async () => {
        const service = serviceFor(
            keyChain({ kmsProvider: "hsm", activeJwk: privateJwk }),
            "pkcs11",
        );

        const exported = await service.export("tenant", "key");

        expect(exported.key).not.toHaveProperty("d");
    });

    it("leaves out unset optional columns so the import accepts the export", async () => {
        // Nullable columns are read back as null, not undefined.
        const service = serviceFor(
            keyChain({
                description: null,
                rotationEnabled: true,
                rotationIntervalDays: null,
                certValidityDays: null,
            } as unknown as Partial<KeyChainEntity>),
            "db",
        );

        const exported = JSON.parse(
            JSON.stringify(await service.export("tenant", "key")),
        );

        expect(exported).not.toHaveProperty("description");
        expect(exported.rotationPolicy).toEqual({ enabled: true });
        expect(KeyChainImportSchema.safeParse(exported).success).toBe(true);
    });

    it("exports the description and rotation intervals that are set", async () => {
        const service = serviceFor(
            keyChain({
                description: "Signing",
                rotationEnabled: true,
                rotationIntervalDays: 90,
                certValidityDays: 365,
            }),
            "db",
        );

        const exported = await service.export("tenant", "key");

        expect(exported).toMatchObject({
            description: "Signing",
            rotationPolicy: {
                enabled: true,
                intervalDays: 90,
                certValidityDays: 365,
            },
        });
    });

    it.each([
        ["a standalone key chain", {}, "standalone", privateJwk, ["leaf"]],
        [
            "the root of an internal chain",
            { rootJwk: rootJwk, rootCertificate: "root" },
            "internalChain",
            rootJwk,
            ["root"],
        ],
    ])("exports the type of %s", async (_, overrides, type, key, crt) => {
        const service = serviceFor(
            keyChain({ activeCertificate: "leaf", ...overrides }),
            "db",
        );

        const exported = await service.export("tenant", "key");

        expect(exported).toMatchObject({ type, key, crt });
        expect(KeyChainImportSchema.safeParse(exported).success).toBe(true);
    });

    it("scopes the lookup to the tenant's signing key chains", async () => {
        const service = serviceFor(keyChain({}), "db") as any;

        await service.export("tenant", "key");

        expect(service.keyChainRepository.findOne).toHaveBeenCalledWith({
            where: { tenantId: "tenant", id: "key", usage: KeyUsage.Sign },
        });
    });
});

describe("KeyChainService.update rotation policy", () => {
    function updateServiceFor(entity: KeyChainEntity) {
        const service = serviceFor(entity, "db") as any;
        service.keyChainRepository.update = vi.fn();
        service.logger = { log: vi.fn() };
        return service as KeyChainService & {
            keyChainRepository: { update: ReturnType<typeof vi.fn> };
        };
    }

    it("rejects enabling rotation without an interval", async () => {
        const service = updateServiceFor(
            keyChain({
                rotationIntervalDays: null,
            } as unknown as Partial<KeyChainEntity>),
        );

        await expect(
            service.update("tenant", "key", {
                rotationPolicy: { enabled: true },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(service.keyChainRepository.update).not.toHaveBeenCalled();
    });

    it("enables rotation with the interval of the request", async () => {
        const service = updateServiceFor(keyChain({}));

        await service.update("tenant", "key", {
            rotationPolicy: { enabled: true, intervalDays: 30 },
        });

        expect(service.keyChainRepository.update).toHaveBeenCalledWith(
            { tenantId: "tenant", id: "key" },
            { rotationEnabled: true, rotationIntervalDays: 30 },
        );
    });

    it("enables rotation with the stored interval", async () => {
        const service = updateServiceFor(
            keyChain({ rotationIntervalDays: 90 }),
        );

        await service.update("tenant", "key", {
            rotationPolicy: { enabled: true },
        });

        expect(service.keyChainRepository.update).toHaveBeenCalledWith(
            { tenantId: "tenant", id: "key" },
            { rotationEnabled: true },
        );
    });

    it("turns off rotation of a key chain without interval", async () => {
        const service = updateServiceFor(
            keyChain({
                rotationEnabled: true,
                rotationIntervalDays: null,
            } as unknown as Partial<KeyChainEntity>),
        );

        await service.update("tenant", "key", {
            rotationPolicy: { enabled: false },
        });

        expect(service.keyChainRepository.update).toHaveBeenCalledWith(
            { tenantId: "tenant", id: "key" },
            { rotationEnabled: false },
        );
    });

    it("leaves other updates of a key chain without interval alone", async () => {
        const service = updateServiceFor(
            keyChain({
                rotationEnabled: true,
                rotationIntervalDays: null,
            } as unknown as Partial<KeyChainEntity>),
        );

        await service.update("tenant", "key", { description: "Signing" });

        expect(service.keyChainRepository.update).toHaveBeenCalledWith(
            { tenantId: "tenant", id: "key" },
            { description: "Signing" },
        );
    });

    it("keeps the description when only the certificate changes", async () => {
        const service = updateServiceFor(keyChain({}));

        await service.update("tenant", "key", { activeCertificate: "PEM" });

        expect(service.keyChainRepository.update).toHaveBeenCalledWith(
            { tenantId: "tenant", id: "key" },
            { activeCertificate: "PEM" },
        );
    });
});

describe("KeyChainService.findByUsageType", () => {
    /** A repository whose `findOne` returns the first row matching `where`. */
    function serviceWith(rows: KeyChainEntity[]) {
        const service = Object.create(KeyChainService.prototype) as any;
        service.keyChainRepository = {
            findOne: async ({ where }: { where: Record<string, unknown> }) =>
                rows.find((row) =>
                    Object.entries(where).every(
                        ([key, value]) =>
                            row[key as keyof KeyChainEntity] === value,
                    ),
                ) ?? null,
        };
        return service as KeyChainService;
    }

    const encryptionKeyChain = keyChain({
        id: "system",
        usageType: KeyUsageType.Encrypt,
        usage: KeyUsage.Encrypt,
    });
    const signingKeyChain = (id: string) =>
        keyChain({
            id,
            usageType: KeyUsageType.Encrypt,
            usage: KeyUsage.Sign,
        });

    it("prefers the encryption key chain over signing key chains with usage type encrypt", async () => {
        const service = serviceWith([
            signingKeyChain("user"),
            encryptionKeyChain,
        ]);

        const found = await service.findByUsageType(
            "tenant",
            KeyUsageType.Encrypt,
        );

        expect(found.id).toBe("system");
    });

    it("still finds an encryption key chain that an import turned into a signing key chain", async () => {
        const service = serviceWith([signingKeyChain("converted")]);

        const found = await service.findByUsageType(
            "tenant",
            KeyUsageType.Encrypt,
        );

        expect(found.id).toBe("converted");
    });
});

describe("KeyChainController authorization", () => {
    const guard = new RolesGuard(new Reflector());
    const context = (handler: (...args: never[]) => unknown, roles: Role[]) =>
        ({
            getHandler: () => handler,
            getClass: () => KeyChainController,
            switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
        }) as unknown as ExecutionContext;

    // Endpoints returning private keys or KMS provider credentials.
    const privileged = {
        export: KeyChainController.prototype.export,
        getTenantKmsConfig: KeyChainController.prototype.getTenantKmsConfig,
        updateTenantKmsConfig:
            KeyChainController.prototype.updateTenantKmsConfig,
        deleteTenantKmsConfig:
            KeyChainController.prototype.deleteTenantKmsConfig,
    };

    describe.each(Object.entries(privileged))("%s", (_, handler) => {
        it.each([
            [Role.Issuances],
            [Role.Presentations],
            [Role.Issuances, Role.Presentations, Role.Clients],
        ])(
            "rejects callers with only key chain management roles (%s)",
            (...roles) => {
                expect(guard.canActivate(context(handler, roles))).toBe(false);
            },
        );

        it.each([Role.TenantAdmin, Role.Tenants])(
            "allows callers with %s",
            (role) => {
                expect(guard.canActivate(context(handler, [role]))).toBe(true);
            },
        );
    });

    it.each([
        KeyChainController.prototype.getById,
        KeyChainController.prototype.getProviders,
        KeyChainController.prototype.getProvidersHealth,
    ])("keeps the management roles for %o", (handler) => {
        expect(guard.canActivate(context(handler, [Role.Issuances]))).toBe(
            true,
        );
    });

    it("requires a tenant context", () => {
        const service = { export: vi.fn() };
        const kms = {
            getTenantConfig: vi.fn(),
            saveTenantConfig: vi.fn(),
            deleteTenantConfig: vi.fn(),
        };
        const controller = new KeyChainController(
            service as unknown as KeyChainService,
            kms as never,
        );
        const token = { roles: [Role.Tenants] } as TokenPayload;

        expect(() => controller.export(token, "key")).toThrow(
            ForbiddenException,
        );
        expect(() => controller.getTenantKmsConfig(token)).toThrow(
            ForbiddenException,
        );
        expect(() =>
            controller.updateTenantKmsConfig(token, { providers: [] } as never),
        ).toThrow(ForbiddenException);
        expect(() => controller.deleteTenantKmsConfig(token)).toThrow(
            ForbiddenException,
        );
        expect(service.export).not.toHaveBeenCalled();
        expect(kms.saveTenantConfig).not.toHaveBeenCalled();
        expect(kms.deleteTenantConfig).not.toHaveBeenCalled();
    });
});
