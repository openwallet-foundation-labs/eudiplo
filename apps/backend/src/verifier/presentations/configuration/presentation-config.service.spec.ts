import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PresentationConfigService } from "./presentation-config.service.js";

const trustedPid = {
    id: "pid",
    format: "dc+sd-jwt",
    meta: { vct_values: ["urn:eudi:pid:1"] },
    trusted_authorities: [
        { type: "etsi_tl", values: [{ trustListId: "pid-issuers" }] },
    ],
};
const { trusted_authorities: _, ...untrustedPid } = trustedPid;

function setup(
    options: {
        skipTrustAuthority?: boolean;
        stored?: unknown[];
        validateImported?: ReturnType<typeof vi.fn>;
    } = {},
) {
    const repository = {
        save: vi.fn(async (config) => config),
        delete: vi.fn(),
        findOneByOrFail: vi.fn().mockResolvedValue({
            id: "pid",
            tenantId: "tenant",
            dcql_query: { credentials: options.stored ?? [trustedPid] },
        }),
    };
    const configImportService = { importConfigsForTenant: vi.fn() };
    const registrationCertificates = {
        scheduleRefresh: vi.fn(),
        validateImported:
            options.validateImported ?? vi.fn().mockResolvedValue(undefined),
    };
    const service = new PresentationConfigService(
        repository as any,
        registrationCertificates as any,
        configImportService as any,
        { register: vi.fn() } as any,
        {} as any,
        {
            publicUrl: "https://eudiplo.example",
            skipTrustAuthority: options.skipTrustAuthority ?? false,
        },
    );
    return {
        service,
        repository,
        configImportService,
        registrationCertificates,
    };
}

describe("PresentationConfigService trusted authorities", () => {
    it("stores a config whose credential queries have trusted_authorities", async () => {
        const { service, repository } = setup();

        await service.storePresentationConfig("tenant", {
            id: "pid",
            dcql_query: { credentials: [trustedPid] },
        } as any);

        expect(repository.save).toHaveBeenCalled();
    });

    it("rejects a new config without trusted_authorities", async () => {
        const { service, repository } = setup();

        await expect(
            service.storePresentationConfig("tenant", {
                id: "pid",
                dcql_query: { credentials: [untrustedPid] },
            } as any),
        ).rejects.toThrow(BadRequestException);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("rejects an update that leaves a stored config without trusted_authorities", async () => {
        const { service, repository } = setup({ stored: [untrustedPid] });

        await expect(
            service.updatePresentationConfig("pid", "tenant", {
                description: "renamed",
            }),
        ).rejects.toThrow(
            "Credential queries without trusted_authorities: pid.",
        );
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("stores a config without trusted_authorities with SKIP_TRUST_AUTHORITY", async () => {
        const { service, repository } = setup({ skipTrustAuthority: true });

        await service.storePresentationConfig("tenant", {
            id: "pid",
            dcql_query: { credentials: [untrustedPid] },
        } as any);

        expect(repository.save).toHaveBeenCalled();
    });

    it("keeps the stored config when an imported file has no trusted_authorities", async () => {
        const { service, repository, configImportService } = setup();
        await (service as any).importForTenant("tenant");
        const { deleteExisting } =
            configImportService.importConfigsForTenant.mock.calls[0][1];

        await expect(
            deleteExisting("tenant", {
                id: "pid",
                dcql_query: { credentials: [untrustedPid] },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(repository.delete).not.toHaveBeenCalled();
    });
});

describe("PresentationConfigService imported registration certificate", () => {
    const overasking = () =>
        vi
            .fn()
            .mockRejectedValue(
                new BadRequestException(
                    "Registration certificate does not authorize the requested DCQL credentials",
                ),
            );

    it("refuses to store a config whose imported certificate fails its checks", async () => {
        const validateImported = overasking();
        const { service, repository } = setup({ validateImported });

        await expect(
            service.storePresentationConfig("tenant", {
                id: "pid",
                dcql_query: { credentials: [trustedPid] },
                registration_cert: { jwt: "imported" },
            } as any),
        ).rejects.toThrow(
            "Registration certificate does not authorize the requested DCQL credentials",
        );
        expect(validateImported).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "pid",
                tenantId: "tenant",
                registration_cert: { jwt: "imported" },
            }),
        );
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("checks the certificate when an update changes it or the DCQL query", async () => {
        const { service, repository } = setup({
            validateImported: overasking(),
        });

        await expect(
            service.updatePresentationConfig("pid", "tenant", {
                registration_cert: { jwt: "imported" },
            } as any),
        ).rejects.toThrow(BadRequestException);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("checks the stored certificate against a changed DCQL query", async () => {
        const validateImported = overasking();
        const { service, repository } = setup({ validateImported });
        repository.findOneByOrFail.mockResolvedValue({
            id: "pid",
            tenantId: "tenant",
            dcql_query: { credentials: [trustedPid] },
            registration_cert: { jwt: "stored" },
        });
        const widened = {
            credentials: [{ ...trustedPid, claims: [{ path: ["age"] }] }],
        };

        await expect(
            service.updatePresentationConfig("pid", "tenant", {
                dcql_query: widened,
            } as any),
        ).rejects.toThrow(BadRequestException);
        expect(validateImported).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "tenant",
                registration_cert: { jwt: "stored" },
                dcql_query: widened,
            }),
        );
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("does not import a new file whose certificate is refused", async () => {
        const { service, repository, configImportService } = setup({
            validateImported: overasking(),
        });
        await (service as any).importForTenant("tenant");
        const { processItem } =
            configImportService.importConfigsForTenant.mock.calls[0][1];

        await expect(
            processItem("tenant", {
                id: "new",
                dcql_query: { credentials: [trustedPid] },
                registration_cert: { jwt: "imported" },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it("keeps the stored config when an imported file has a refused certificate", async () => {
        const validateImported = overasking();
        const { service, repository, configImportService } = setup({
            validateImported,
        });
        await (service as any).importForTenant("tenant");
        const { deleteExisting } =
            configImportService.importConfigsForTenant.mock.calls[0][1];

        await expect(
            deleteExisting("tenant", {
                id: "pid",
                dcql_query: { credentials: [trustedPid] },
                registration_cert: { jwt: "imported" },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(validateImported).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "tenant",
                registration_cert: { jwt: "imported" },
            }),
        );
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it("does not check the certificate when an update leaves it and the DCQL query alone", async () => {
        const validateImported = overasking();
        const { service, repository } = setup({ validateImported });

        await service.updatePresentationConfig("pid", "tenant", {
            description: "renamed",
        });

        expect(validateImported).not.toHaveBeenCalled();
        expect(repository.save).toHaveBeenCalled();
    });
});
