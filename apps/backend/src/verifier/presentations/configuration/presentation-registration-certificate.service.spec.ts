import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";
import { PresentationRegistrationCertificateService } from "./presentation-registration-certificate.service.js";

/** Access key chains by id; `default` is the tenant's default. */
const accessCertificates: Record<string, { keyId: string; hash: string }> = {
    default: { keyId: "default", hash: "default-hash" },
    previous: { keyId: "previous", hash: "previous-hash" },
    pinned: { keyId: "pinned", hash: "pinned-hash" },
};

function accessCertificate(keyId: string) {
    return { keyId, crt: [keyId] } as any;
}

function createService(
    registrar: Record<string, unknown> = {},
    cert: Record<string, unknown> = {},
) {
    const repository = {
        update: vi.fn().mockResolvedValue(undefined),
        findOneBy: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
    };
    const registrarService = {
        isEnabledForTenant: vi.fn().mockResolvedValue(true),
        computeDcqlFingerprint: vi.fn().mockReturnValue("dcql-fp"),
        computeSpecFingerprint: vi.fn().mockReturnValue("spec-fp"),
        computeAuthorizedCredentialsFingerprint: vi
            .fn()
            .mockReturnValue("cred-fp"),
        resolveRegistrationCertificate: vi.fn().mockResolvedValue({
            jwt: "fresh-jwt",
            payload: { credentials: [], iat: 100, exp: 9_999_999_999 },
            source: "registrar",
        }),
        ...registrar,
    };
    const certService = {
        find: vi.fn(({ keyId }: { keyId?: string }) =>
            Promise.resolve(accessCertificate(keyId ?? "default")),
        ),
        getCertHash: vi.fn(
            (c: { keyId: string }) => accessCertificates[c.keyId].hash,
        ),
        ...cert,
    };
    const logger = { setContext: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const service = new PresentationRegistrationCertificateService(
        repository as any,
        registrarService as any,
        certService as any,
        { publicUrl: "https://eudiplo.example", skipTrustAuthority: false },
        logger as any,
    );
    return { service, repository, registrarService, certService, logger };
}

function config(overrides: Partial<PresentationConfig> = {}) {
    return {
        id: "config",
        tenantId: "tenant",
        dcql_query: { credentials: [{ id: "<TENANT_URL>" }] },
        registration_cert: { body: { privacy_policy: "p" } },
        registrationCertCache: null,
        ...overrides,
    } as unknown as PresentationConfig;
}

const validCache = {
    jwt: "cached-jwt",
    fingerprint: "cred-fp",
    dcqlFingerprint: "dcql-fp",
    specFingerprint: "spec-fp",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    source: "registrar" as const,
    accessKeyChainId: "default",
    accessCertificateHash: "default-hash",
};

describe("PresentationRegistrationCertificateService.getOrIssueRegistrationCertificate", () => {
    it("returns nothing without a spec or an enabled registrar", async () => {
        const { service, registrarService } = createService({
            isEnabledForTenant: vi.fn().mockResolvedValue(false),
        });
        await expect(
            service.getOrIssueRegistrationCertificate(
                config({ registration_cert: undefined }),
                {},
                "r",
            ),
        ).resolves.toBeUndefined();
        await expect(
            service.getOrIssueRegistrationCertificate(config(), {}, "r"),
        ).resolves.toBeUndefined();
        expect(
            registrarService.resolveRegistrationCertificate,
        ).not.toHaveBeenCalled();
    });

    it("uses a cache that matches spec, DCQL and is not about to expire", async () => {
        const { service, repository } = createService();
        await expect(
            service.getOrIssueRegistrationCertificate(
                config({ registrationCertCache: validCache }),
                {},
                "r",
            ),
        ).resolves.toBe("cached-jwt");
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
        ["changed DCQL", { dcqlFingerprint: "other" }],
        ["changed spec", { specFingerprint: "other" }],
        [
            "expiry within the skew",
            { expiresAt: Math.floor(Date.now() / 1000) + 30 },
        ],
        [
            "a cache without the access certificate",
            { accessKeyChainId: undefined, accessCertificateHash: undefined },
        ],
        [
            "a cache for a previous default access certificate",
            {
                accessKeyChainId: "previous",
                accessCertificateHash: "previous-hash",
            },
        ],
    ])("reissues and persists the cache on %s", async (_, cacheOverride) => {
        const { service, repository, registrarService } = createService();
        const presentationConfig = config({
            registrationCertCache: { ...validCache, ...cacheOverride },
        });

        await expect(
            service.getOrIssueRegistrationCertificate(
                presentationConfig,
                { resolved: true },
                "request",
            ),
        ).resolves.toBe("fresh-jwt");

        expect(
            registrarService.resolveRegistrationCertificate,
        ).toHaveBeenCalledWith(
            presentationConfig.registration_cert,
            { resolved: true },
            "request",
            "tenant",
            { accessKeyChainId: "default" },
        );
        const newCache = {
            jwt: "fresh-jwt",
            accessKeyChainId: "default",
            accessCertificateHash: "default-hash",
            fingerprint: "cred-fp",
            dcqlFingerprint: "dcql-fp",
            specFingerprint: "spec-fp",
            issuedAt: 100,
            expiresAt: 9_999_999_999,
            source: "registrar",
        };
        expect(repository.update).toHaveBeenCalledWith(
            { id: "config", tenantId: "tenant" },
            { registrationCertCache: newCache },
        );
        expect(presentationConfig.registrationCertCache).toEqual(newCache);
    });

    it("uses the cache for a session signed by the current access certificate", async () => {
        const { service, registrarService } = createService();
        await expect(
            service.getOrIssueRegistrationCertificate(
                config({ registrationCertCache: validCache }),
                {},
                "r",
                accessCertificate("default"),
            ),
        ).resolves.toBe("cached-jwt");
        expect(
            registrarService.resolveRegistrationCertificate,
        ).not.toHaveBeenCalled();
    });

    it("links the session's access key chain and keeps the cache when the session is pinned to a previous one", async () => {
        const { service, repository, registrarService, logger } =
            createService();
        const presentationConfig = config({
            registrationCertCache: validCache,
        });

        await expect(
            service.getOrIssueRegistrationCertificate(
                presentationConfig,
                {},
                "request",
                accessCertificate("previous"),
            ),
        ).resolves.toBe("fresh-jwt");

        expect(
            registrarService.resolveRegistrationCertificate,
        ).toHaveBeenCalledWith(
            presentationConfig.registration_cert,
            {},
            "request",
            "tenant",
            { accessKeyChainId: "previous" },
        );
        expect(repository.update).not.toHaveBeenCalled();
        expect(presentationConfig.registrationCertCache).toBe(validCache);
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({ accessKeyChainId: "previous" }),
            expect.any(String),
        );
    });

    it("caches a certificate for the access key chain the configuration pins", async () => {
        const { service, repository, certService } = createService();
        const presentationConfig = config({ accessKeyChainId: "pinned" });

        await service.getOrIssueRegistrationCertificate(
            presentationConfig,
            {},
            "request",
            accessCertificate("pinned"),
        );

        expect(certService.find).toHaveBeenCalledWith(
            expect.objectContaining({ keyId: "pinned" }),
        );
        expect(repository.update).toHaveBeenCalledWith(
            { id: "config", tenantId: "tenant" },
            {
                registrationCertCache: expect.objectContaining({
                    accessKeyChainId: "pinned",
                    accessCertificateHash: "pinned-hash",
                }),
            },
        );
    });

    it("caches without an access certificate when the tenant has no access key chain", async () => {
        const { service, repository, registrarService } = createService(
            {},
            { find: vi.fn().mockRejectedValue(new NotFoundException()) },
        );
        const presentationConfig = config();

        await service.getOrIssueRegistrationCertificate(
            presentationConfig,
            {},
            "request",
        );

        expect(
            registrarService.resolveRegistrationCertificate,
        ).toHaveBeenCalledWith(
            presentationConfig.registration_cert,
            {},
            "request",
            "tenant",
            { accessKeyChainId: undefined },
        );
        const cache = repository.update.mock.calls[0][1].registrationCertCache;
        expect(cache).not.toHaveProperty("accessCertificateHash");

        // The cache stays valid while there is still no access key chain.
        await expect(
            service.getOrIssueRegistrationCertificate(
                presentationConfig,
                {},
                "request",
            ),
        ).resolves.toBe("fresh-jwt");
        expect(
            registrarService.resolveRegistrationCertificate,
        ).toHaveBeenCalledTimes(1);
    });
});

describe("PresentationRegistrationCertificateService current access certificate", () => {
    it("does not cache a session's certificate when the configuration has no current access key chain", async () => {
        const { service, repository, logger } = createService(
            {},
            { find: vi.fn().mockRejectedValue(new NotFoundException()) },
        );

        await expect(
            service.getOrIssueRegistrationCertificate(
                config({ accessKeyChainId: "deleted" }),
                {},
                "request",
                accessCertificate("default"),
            ),
        ).resolves.toBe("fresh-jwt");
        expect(repository.update).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({ accessKeyChainId: "default" }),
            expect.any(String),
        );
    });

    it("fails instead of caching without the link when the lookup fails for another reason", async () => {
        const { service, repository, registrarService } = createService(
            {},
            { find: vi.fn().mockRejectedValue(new Error("database down")) },
        );

        await expect(
            service.getOrIssueRegistrationCertificate(config(), {}, "request"),
        ).rejects.toThrow("database down");
        expect(
            registrarService.resolveRegistrationCertificate,
        ).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });
});

describe("PresentationRegistrationCertificateService.reissue", () => {
    it("rejects configs without a spec or without an enabled registrar", async () => {
        await expect(
            createService().service.reissue(
                config({ registration_cert: undefined }),
            ),
        ).rejects.toThrow("Presentation config has no registrationCert spec");
        await expect(
            createService({
                isEnabledForTenant: vi.fn().mockResolvedValue(false),
            }).service.reissue(config()),
        ).rejects.toThrow("Registrar is not enabled for this tenant");
    });

    it("bypasses a valid cache, resolves <TENANT_URL> in the DCQL query and passes the access key chain", async () => {
        const { service, registrarService, repository } = createService();
        await service.reissue(
            config({
                registrationCertCache: validCache,
                accessKeyChainId: "pinned",
            }),
        );

        expect(
            registrarService.resolveRegistrationCertificate,
        ).toHaveBeenCalledWith(
            { body: { privacy_policy: "p" } },
            {
                credentials: [{ id: "https://eudiplo.example/issuers/tenant" }],
            },
            "reissue-config",
            "tenant",
            { accessKeyChainId: "pinned" },
        );
        expect(repository.update).toHaveBeenCalledWith(
            { id: "config", tenantId: "tenant" },
            {
                registrationCertCache: expect.objectContaining({
                    accessKeyChainId: "pinned",
                    accessCertificateHash: "pinned-hash",
                }),
            },
        );
    });
});

describe("PresentationRegistrationCertificateService.scheduleRefresh", () => {
    it("stores a freshly resolved cache for the latest config", async () => {
        const { service, repository } = createService();
        repository.findOneBy.mockResolvedValue(config());

        service.scheduleRefresh("config", "tenant");

        await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
        expect(repository.save.mock.calls[0][0].registrationCertCache).toEqual(
            expect.objectContaining({
                jwt: "fresh-jwt",
                accessKeyChainId: "default",
                accessCertificateHash: "default-hash",
            }),
        );
    });

    it("replaces a cache for a previous default access certificate", async () => {
        const { service, repository, registrarService } = createService();
        repository.findOneBy.mockResolvedValue(
            config({
                registrationCertCache: {
                    ...validCache,
                    accessKeyChainId: "previous",
                    accessCertificateHash: "previous-hash",
                },
            }),
        );

        service.scheduleRefresh("config", "tenant");

        await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
        expect(
            registrarService.resolveRegistrationCertificate.mock.calls[0][4],
        ).toEqual({ accessKeyChainId: "default" });
        expect(repository.save.mock.calls[0][0].registrationCertCache).toEqual(
            expect.objectContaining({
                jwt: "fresh-jwt",
                accessCertificateHash: "default-hash",
            }),
        );
    });

    it("keeps a cache for the current access certificate", async () => {
        const { service, repository, registrarService } = createService();
        repository.findOneBy.mockResolvedValue(
            config({ registrationCertCache: validCache }),
        );

        service.scheduleRefresh("config", "tenant");

        await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
        expect(
            registrarService.resolveRegistrationCertificate,
        ).not.toHaveBeenCalled();
        expect(repository.save.mock.calls[0][0].registrationCertCache).toBe(
            validCache,
        );
    });

    it("stores a cache without the access certificate when the tenant has none", async () => {
        const { service, repository } = createService(
            {},
            { find: vi.fn().mockRejectedValue(new NotFoundException()) },
        );
        repository.findOneBy.mockResolvedValue(config());

        service.scheduleRefresh("config", "tenant");

        await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
        const cache = repository.save.mock.calls[0][0].registrationCertCache;
        expect(cache).toEqual(expect.objectContaining({ jwt: "fresh-jwt" }));
        expect(cache).not.toHaveProperty("accessCertificateHash");
    });

    it("clears the cache when the access certificate cannot be read", async () => {
        const { service, repository, registrarService } = createService(
            {},
            { find: vi.fn().mockRejectedValue(new Error("database down")) },
        );
        repository.findOneBy.mockResolvedValue(
            config({ registrationCertCache: validCache }),
        );

        service.scheduleRefresh("config", "tenant");

        await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
        expect(
            repository.save.mock.calls[0][0].registrationCertCache,
        ).toBeNull();
        expect(
            registrarService.resolveRegistrationCertificate,
        ).not.toHaveBeenCalled();
    });

    it("clears the cache on registrar failures but logs user-config errors", async () => {
        const failing = createService({
            resolveRegistrationCertificate: vi
                .fn()
                .mockRejectedValue(new Error("network")),
        });
        failing.repository.findOneBy.mockResolvedValue(config());
        failing.service.scheduleRefresh("config", "tenant");
        await vi.waitFor(() =>
            expect(failing.repository.save).toHaveBeenCalled(),
        );
        expect(
            failing.repository.save.mock.calls[0][0].registrationCertCache,
        ).toBeNull();

        const invalid = createService({
            resolveRegistrationCertificate: vi
                .fn()
                .mockRejectedValue(new BadRequestException("bad spec")),
        });
        invalid.repository.findOneBy.mockResolvedValue(config());
        invalid.service.scheduleRefresh("config", "tenant");
        await vi.waitFor(() => expect(invalid.logger.warn).toHaveBeenCalled());
        expect(invalid.repository.save).not.toHaveBeenCalled();
    });
});
