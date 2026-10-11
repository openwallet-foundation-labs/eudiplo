import { webcrypto } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyUsageType } from "../crypto/key/types/key-usage-type.js";
import { AccessCertificateService } from "./access-certificate.service.js";
import {
    accessCertificateControllerAccessCertificates,
    accessCertificateControllerRegister,
} from "./generated/index.js";

vi.mock("./generated/index.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./generated/index.js")>()),
    accessCertificateControllerAccessCertificates: vi.fn(),
    accessCertificateControllerRegister: vi.fn(),
}));

const crypto = webcrypto as Crypto;
const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };

async function selfSigned(name: string): Promise<string> {
    const keys = (await crypto.subtle.generateKey(algorithm, true, [
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
    };
    let certService: { addCertificate: ReturnType<typeof vi.fn> };
    let service: AccessCertificateService;

    beforeEach(() => {
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
            defaultDescription:
                "Access certificate from registrar (ID: registrar-cert)",
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
});
