import { webcrypto } from "node:crypto";
import {
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyUsageType } from "../crypto/key/types/key-usage-type.js";
import { AccessCertificateService } from "./access-certificate.service.js";
import {
    accessCertificateControllerAccessCertificates,
    accessCertificateControllerDelete,
    accessCertificateControllerRegister,
} from "./generated/index.js";

vi.mock("./generated/index.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./generated/index.js")>()),
    accessCertificateControllerAccessCertificates: vi.fn(),
    accessCertificateControllerDelete: vi.fn(),
    accessCertificateControllerRegister: vi.fn(),
}));

const crypto = webcrypto as Crypto;
const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };

async function selfSigned(name: string, keys?: CryptoKeyPair): Promise<string> {
    keys ??= (await crypto.subtle.generateKey(algorithm, true, [
        "sign",
        "verify",
    ])) as CryptoKeyPair;
    const cert = await x509.X509CertificateGenerator.createSelfSigned(
        {
            serialNumber: "01",
            name,
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            keys,
            signingAlgorithm: algorithm,
        },
        crypto,
    );
    return cert.toString("pem");
}

function registrarEntry(
    id: string,
    certificate: string,
    revoked: string | null = null,
) {
    return {
        id,
        relyingPartyId: "rp-1",
        certificate,
        issuanceMethod: "csr" as const,
        profile: "generic-wrpac" as const,
        revoked,
        createdAt: "2026-10-01T00:00:00Z",
    };
}

describe("AccessCertificateService.findRegistrarAccessCertificateId", () => {
    const client = {} as any;
    let signing: string;
    let other: string;
    let certService: { find: ReturnType<typeof vi.fn> };
    let service: AccessCertificateService;

    beforeAll(async () => {
        signing = await selfSigned("CN=access.example");
        other = await selfSigned("CN=other.example");
    });

    beforeEach(() => {
        vi.mocked(accessCertificateControllerAccessCertificates).mockReset();
        certService = {
            find: vi
                .fn()
                .mockResolvedValue({ keyId: "access", crt: [signing] }),
        };
        service = new AccessCertificateService(
            {} as any,
            {} as any,
            certService as any,
            {} as any,
        );
    });

    function registrarReturns(...entries: ReturnType<typeof registrarEntry>[]) {
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            data: entries,
        } as any);
    }

    it("returns the registrar id of the certificate held by the access key chain", async () => {
        registrarReturns(
            registrarEntry("ac-other", other),
            registrarEntry("ac-signing", signing),
        );

        await expect(
            service.findRegistrarAccessCertificateId(
                "tenant",
                client,
                "rp-1",
                "access",
            ),
        ).resolves.toBe("ac-signing");
        expect(certService.find).toHaveBeenCalledWith({
            tenantId: "tenant",
            type: KeyUsageType.Access,
            keyId: "access",
            skipValidation: true,
        });
        expect(
            accessCertificateControllerAccessCertificates,
        ).toHaveBeenCalledWith({
            client,
            query: { rp: "rp-1" },
        });
    });

    it("ignores a revoked access certificate", async () => {
        registrarReturns(
            registrarEntry("ac-signing", signing, "2026-10-02T00:00:00Z"),
        );

        await expect(
            service.findRegistrarAccessCertificateId("tenant", client, "rp-1"),
        ).resolves.toBeUndefined();
    });

    it("returns nothing for a certificate the registrar did not issue", async () => {
        registrarReturns(registrarEntry("ac-other", other));

        await expect(
            service.findRegistrarAccessCertificateId("tenant", client, "rp-1"),
        ).resolves.toBeUndefined();
    });

    it("returns nothing without an access key chain", async () => {
        certService.find.mockRejectedValue(new Error("not found"));

        await expect(
            service.findRegistrarAccessCertificateId("tenant", client, "rp-1"),
        ).resolves.toBeUndefined();
        expect(
            accessCertificateControllerAccessCertificates,
        ).not.toHaveBeenCalled();
    });

    it("returns nothing when the registrar cannot list access certificates", async () => {
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            error: { statusCode: 500 },
        } as any);

        await expect(
            service.findRegistrarAccessCertificateId("tenant", client, "rp-1"),
        ).resolves.toBeUndefined();
    });
});

// The Web Client deletes a new access key when the enrollment answers 400,
// 403 or 404, so every refusal must keep its status and come before the
// certificate is stored.
describe("AccessCertificateService.createAccessCertificate", () => {
    let authService: {
        getClient: ReturnType<typeof vi.fn>;
        getRelyingPartyId: ReturnType<typeof vi.fn>;
    };
    let keyChainService: {
        createCertificateSigningRequest: ReturnType<typeof vi.fn>;
        getEntity: ReturnType<typeof vi.fn>;
    };
    let certService: { addCertificate: ReturnType<typeof vi.fn> };
    let service: AccessCertificateService;
    let keys: CryptoKeyPair;
    /** The certificate the key chain holds before the enrollment. */
    let currentPem: string;

    beforeAll(async () => {
        keys = (await crypto.subtle.generateKey(algorithm, true, [
            "sign",
            "verify",
        ])) as CryptoKeyPair;
        currentPem = await selfSigned("CN=access", keys);
    });

    beforeEach(() => {
        vi.mocked(accessCertificateControllerAccessCertificates).mockReset();
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({ data: [] } as any);
        vi.mocked(accessCertificateControllerDelete).mockReset();
        vi.mocked(accessCertificateControllerDelete).mockResolvedValue(
            {} as any,
        );
        vi.mocked(accessCertificateControllerRegister).mockReset();
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            data: { id: "registrar-cert", crt: "PEM" },
        } as any);
        authService = {
            getClient: vi.fn().mockResolvedValue({}),
            getRelyingPartyId: vi.fn().mockResolvedValue("rp-1"),
        };
        keyChainService = {
            createCertificateSigningRequest: vi.fn().mockResolvedValue("CSR"),
            getEntity: vi.fn(async () => ({ activeCertificate: currentPem })),
        };
        certService = { addCertificate: vi.fn().mockResolvedValue("access") };
        service = new AccessCertificateService(
            {} as any,
            authService as any,
            certService as any,
            keyChainService as any,
        );
    });

    it("stores the certificate the registrar issued", async () => {
        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).resolves.toEqual({
            id: "registrar-cert",
            certId: "access",
            crt: "PEM",
        });
        expect(certService.addCertificate).toHaveBeenCalledWith("tenant", {
            crt: ["PEM"],
            keyId: "access",
        });
    });

    it.each([
        {
            refusal: "the registrar authentication fails",
            setup: () =>
                authService.getClient.mockRejectedValue(
                    new BadRequestException(
                        "Failed to authenticate with registrar: invalid_grant",
                    ),
                ),
            expected: BadRequestException,
        },
        {
            refusal: "there is no registrar configuration",
            setup: () =>
                authService.getClient.mockRejectedValue(
                    new NotFoundException("No registrar configuration found"),
                ),
            expected: NotFoundException,
        },
        {
            refusal: "the relying party cannot be found or registered",
            setup: () =>
                authService.getRelyingPartyId.mockRejectedValue(
                    new BadRequestException(
                        "Failed to fetch relying parties from registrar",
                    ),
                ),
            expected: BadRequestException,
        },
        {
            refusal: "the key does not exist",
            setup: () =>
                keyChainService.createCertificateSigningRequest.mockRejectedValue(
                    new NotFoundException("Key chain not found"),
                ),
            expected: NotFoundException,
        },
        {
            refusal: "the registrar rejects the certificate request",
            setup: () =>
                vi
                    .mocked(accessCertificateControllerRegister)
                    .mockResolvedValue({ error: { status: 400 } } as any),
            expected: BadRequestException,
        },
    ])(
        "passes on the refusal and stores nothing when $refusal",
        async ({ setup, expected }) => {
            setup();

            await expect(
                service.createAccessCertificate("tenant", { keyId: "access" }),
            ).rejects.toBeInstanceOf(expected);
            expect(certService.addCertificate).not.toHaveBeenCalled();
        },
    );

    // A lost response or an error after the registrar issued the certificate
    // must not orphan it there.
    it.each([
        {
            failure: "answers with an error",
            setup: () =>
                vi
                    .mocked(accessCertificateControllerRegister)
                    .mockResolvedValue({ error: { status: 400 } } as any),
        },
        {
            failure: "does not answer",
            setup: () =>
                vi
                    .mocked(accessCertificateControllerRegister)
                    .mockRejectedValue(new TypeError("fetch failed")),
        },
    ])(
        "stores the certificate the registrar lists for the key when the request $failure",
        async ({ setup }) => {
            setup();
            const issued = await selfSigned("CN=issued", keys);
            vi.mocked(
                accessCertificateControllerAccessCertificates,
            ).mockResolvedValue({
                data: [
                    registrarEntry("ac-other", await selfSigned("CN=other")),
                    registrarEntry("ac-issued", issued),
                ],
            } as any);

            await expect(
                service.createAccessCertificate("tenant", { keyId: "access" }),
            ).resolves.toEqual({
                id: "ac-issued",
                certId: "access",
                crt: issued,
            });
            expect(keyChainService.getEntity).toHaveBeenCalledWith(
                "tenant",
                "access",
            );
        },
    );

    it("refuses a re-enrollment the registrar refuses, though it lists the certificate the key holds", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            error: { status: 400 },
        } as any);
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            data: [registrarEntry("ac-current", currentPem)],
        } as any);

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(certService.addCertificate).not.toHaveBeenCalled();
    });

    it("skips a listed certificate it cannot read and stores the matching one", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            error: { status: 400 },
        } as any);
        const issued = await selfSigned("CN=issued", keys);
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            data: [
                registrarEntry("ac-garbage", "not a certificate"),
                registrarEntry("ac-issued", issued),
            ],
        } as any);

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).resolves.toMatchObject({ id: "ac-issued" });
    });

    it("passes on the registrar error when the recovery lookup fails", async () => {
        const failure = new TypeError("fetch failed");
        vi.mocked(accessCertificateControllerRegister).mockRejectedValue(
            failure,
        );
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockRejectedValue(new TypeError("fetch failed again"));

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBe(failure);
        expect(certService.addCertificate).not.toHaveBeenCalled();
    });

    it("refuses an answer without certificate", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue(
            {} as any,
        );

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(certService.addCertificate).not.toHaveBeenCalled();
    });

    it("passes on the storage error when the revocation fails too", async () => {
        const failure = new Error("db down");
        certService.addCertificate.mockRejectedValue(failure);
        vi.mocked(accessCertificateControllerDelete).mockRejectedValue(
            new TypeError("fetch failed"),
        );

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBe(failure);
    });

    it("does not store a revoked certificate the registrar lists for the key", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            error: { status: 400 },
        } as any);
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            data: [
                registrarEntry(
                    "ac-revoked",
                    await selfSigned("CN=issued", keys),
                    "2026-10-02T00:00:00Z",
                ),
            ],
        } as any);

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(certService.addCertificate).not.toHaveBeenCalled();
    });

    it("passes on a failed request when the registrar lists no certificate for the key", async () => {
        const failure = new TypeError("fetch failed");
        vi.mocked(accessCertificateControllerRegister).mockRejectedValue(
            failure,
        );

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBe(failure);
        expect(certService.addCertificate).not.toHaveBeenCalled();
    });

    it("does not revoke a found certificate it cannot store, as it may predate the request", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            error: { status: 400 },
        } as any);
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({
            data: [
                registrarEntry("ac-live", await selfSigned("CN=live", keys)),
            ],
        } as any);
        certService.addCertificate.mockRejectedValue(new Error("db down"));

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toThrow("db down");
        expect(accessCertificateControllerDelete).not.toHaveBeenCalled();
    });

    it("revokes an issued certificate it cannot store", async () => {
        const failure = new Error("database unavailable");
        certService.addCertificate.mockRejectedValue(failure);

        await expect(
            service.createAccessCertificate("tenant", { keyId: "access" }),
        ).rejects.toBe(failure);
        expect(accessCertificateControllerDelete).toHaveBeenCalledWith({
            client: {},
            path: { id: "registrar-cert" },
        });
    });
});

describe("AccessCertificateService.createAccessKeyChain", () => {
    let authService: {
        getClient: ReturnType<typeof vi.fn>;
        getRelyingPartyId: ReturnType<typeof vi.fn>;
    };
    let keyChainService: {
        create: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        createCertificateSigningRequest: ReturnType<typeof vi.fn>;
        getEntity: ReturnType<typeof vi.fn>;
    };
    let certService: { addCertificate: ReturnType<typeof vi.fn> };
    let service: AccessCertificateService;
    let selfSignedPem: string;

    beforeAll(async () => {
        selfSignedPem = await selfSigned("CN=new access key");
    });

    beforeEach(() => {
        vi.mocked(accessCertificateControllerAccessCertificates).mockReset();
        vi.mocked(
            accessCertificateControllerAccessCertificates,
        ).mockResolvedValue({ data: [] } as any);
        vi.mocked(accessCertificateControllerDelete).mockReset();
        vi.mocked(accessCertificateControllerDelete).mockResolvedValue(
            {} as any,
        );
        vi.mocked(accessCertificateControllerRegister).mockReset();
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            data: { id: "registrar-cert", crt: "PEM" },
        } as any);
        authService = {
            getClient: vi.fn().mockResolvedValue({}),
            getRelyingPartyId: vi.fn().mockResolvedValue("rp-1"),
        };
        keyChainService = {
            create: vi.fn().mockResolvedValue("new-key"),
            delete: vi.fn().mockResolvedValue(undefined),
            createCertificateSigningRequest: vi.fn().mockResolvedValue("CSR"),
            getEntity: vi.fn(async () => ({
                activeCertificate: selfSignedPem,
            })),
        };
        certService = { addCertificate: vi.fn().mockResolvedValue("new-key") };
        service = new AccessCertificateService(
            {} as any,
            authService as any,
            certService as any,
            keyChainService as any,
        );
    });

    it("creates a standalone access key chain and stores its registrar certificate", async () => {
        await expect(
            service.createAccessKeyChain("tenant", {
                description: "Access",
                kmsProvider: "db",
            }),
        ).resolves.toEqual({
            id: "registrar-cert",
            certId: "new-key",
            crt: "PEM",
        });
        expect(keyChainService.create).toHaveBeenCalledWith("tenant", {
            usageType: KeyUsageType.Access,
            type: "standalone",
            description: "Access",
            kmsProvider: "db",
        });
        expect(certService.addCertificate).toHaveBeenCalledWith(
            "tenant",
            expect.objectContaining({ keyId: "new-key" }),
        );
        expect(keyChainService.delete).not.toHaveBeenCalled();
    });

    it("deletes the new key chain when the registrar refuses the certificate", async () => {
        vi.mocked(accessCertificateControllerRegister).mockResolvedValue({
            error: { status: 400 },
        } as any);

        await expect(
            service.createAccessKeyChain("tenant", {}),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(keyChainService.delete).toHaveBeenCalledWith(
            "tenant",
            "new-key",
        );
    });

    it("revokes the issued certificate and deletes the key chain when the certificate cannot be stored", async () => {
        certService.addCertificate.mockRejectedValue(new Error("db down"));

        await expect(
            service.createAccessKeyChain("tenant", {}),
        ).rejects.toThrow("db down");
        expect(accessCertificateControllerDelete).toHaveBeenCalledWith({
            client: {},
            path: { id: "registrar-cert" },
        });
        expect(keyChainService.delete).toHaveBeenCalledWith(
            "tenant",
            "new-key",
        );
    });

    it.each([
        {
            failure: "an HTTP error",
            error: new BadRequestException("Registrar said no"),
            reason: "Registrar said no",
        },
        {
            failure: "another error",
            error: new Error("db down"),
            reason: "Failed to create access certificate",
        },
    ])(
        "answers 500 naming the key chain it cannot delete after $failure",
        async ({ error, reason }) => {
            certService.addCertificate.mockRejectedValue(error);
            keyChainService.delete.mockRejectedValue(new Error("KMS down"));

            const thrown = await service
                .createAccessKeyChain("tenant", {})
                .catch((e: unknown) => e);

            expect(thrown).toBeInstanceOf(InternalServerErrorException);
            expect((thrown as Error).message).toBe(
                `${reason}. The new access key chain new-key could not be deleted; delete it.`,
            );
        },
    );

    it.each([
        {
            refusal: "there is no registrar configuration",
            setup: () =>
                authService.getClient.mockRejectedValue(
                    new NotFoundException("No registrar configuration found"),
                ),
            expected: NotFoundException,
        },
        {
            refusal: "the relying party cannot be found or registered",
            setup: () =>
                authService.getRelyingPartyId.mockRejectedValue(
                    new BadRequestException(
                        "Failed to fetch relying parties from registrar",
                    ),
                ),
            expected: BadRequestException,
        },
    ])("creates no key chain when $refusal", async ({ setup, expected }) => {
        setup();

        await expect(
            service.createAccessKeyChain("tenant", {}),
        ).rejects.toBeInstanceOf(expected);
        expect(keyChainService.create).not.toHaveBeenCalled();
    });
});
