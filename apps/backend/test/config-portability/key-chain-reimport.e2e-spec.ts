import { webcrypto, X509Certificate } from "node:crypto";
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as x509 from "@peculiar/x509";
import { exportJWK, generateKeyPair } from "jose";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KeyChainEntity } from "../../src/crypto/key/entities/key-chain.entity.js";
import { ConfigBundleService } from "../../src/platform/config-portability/config-bundle.service.js";
import { ConfigBundleApplyService } from "../../src/platform/config-portability/config-bundle-apply.service.js";
import { ConfigFolderBundleService } from "../../src/platform/config-portability/config-folder-bundle.service.js";
import type { ConfigBundle } from "../../src/platform/config-portability/config-resource.types.js";
import { ConfigResourceMetadataEntity } from "../../src/platform/config-portability/entities/config-resource-metadata.entity.js";
import { addBundleDocument } from "../shared/config-bundle.js";

const HAIP_KEY_CHAINS = resolve(__dirname, "../fixtures/haip/key-chains");

/**
 * Startup imports with CONFIG_IMPORT_MODE=upsert apply the config folder on
 * every start. An unchanged private key file must not import its key again:
 * that generated a new self-signed certificate each time and, with rotation,
 * a new active signing key.
 */
describe("re-importing unchanged key chain files", () => {
    let app: INestApplication;
    let runtimeFolder: string;
    let configRoot: string;
    const originalEnvironment = {
        CONFIG_FOLDER: process.env.CONFIG_FOLDER,
        CONFIG_IMPORT_MODE: process.env.CONFIG_IMPORT_MODE,
        FOLDER: process.env.FOLDER,
    };

    beforeAll(async () => {
        runtimeFolder = mkdtempSync(join(tmpdir(), "eudiplo-key-reimport-"));
        configRoot = join(runtimeFolder, "config");
        mkdirSync(configRoot);
        cpSync(
            resolve(__dirname, "../../../../assets/config/demo"),
            join(configRoot, "demo"),
            { recursive: true },
        );
        cpSync(
            resolve(__dirname, "../fixtures/haip"),
            join(configRoot, "haip"),
            { recursive: true },
        );
        // Unversioned files with `key`, as CONFIG_FOLDER accepts them.
        const legacy = join(configRoot, "legacy");
        mkdirSync(join(legacy, "key-chains"), { recursive: true });
        writeFileSync(
            join(legacy, "info.json"),
            JSON.stringify({ name: "Legacy key files" }),
        );
        for (const file of readdirSync(HAIP_KEY_CHAINS)) {
            const { keySource, ...spec } = JSON.parse(
                readFileSync(join(HAIP_KEY_CHAINS, file), "utf8"),
            ).spec;
            writeFileSync(
                join(legacy, "key-chains", file),
                JSON.stringify({ ...spec, key: keySource.jwk }),
            );
        }
        process.env.CONFIG_FOLDER = configRoot;
        process.env.CONFIG_IMPORT_MODE = "upsert";
        process.env.FOLDER = runtimeFolder;

        const { AppModule } = await import("../../src/app.module.js");
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    }, 120_000);

    afterAll(async () => {
        await app?.close();
        rmSync(runtimeFolder, { recursive: true, force: true });
        for (const [key, value] of Object.entries(originalEnvironment)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    const keyMaterial = async (tenantId: string) =>
        (
            await app
                .get(DataSource)
                .getRepository(KeyChainEntity)
                .find({ where: { tenantId }, order: { id: "ASC" } })
        ).map((keyChain) => ({
            id: keyChain.id,
            activeJwk: keyChain.activeJwk,
            activeCertificate: keyChain.activeCertificate,
            rootJwk: keyChain.rootJwk,
            rootCertificate: keyChain.rootCertificate,
        }));

    const planKeyChains = async (
        tenantId: string,
        mode: "upsert" | "replace" = "upsert",
    ) => {
        const root = join(configRoot, tenantId);
        const bundle = app
            .get(ConfigFolderBundleService)
            .buildBundle(tenantId, root);
        const plan = await app
            .get(ConfigBundleService)
            .plan(tenantId, bundle, mode, `folder:${root}`);
        return plan.items.filter((item) => item.kind === "KeyChain");
    };

    it.each(
        ["demo", "haip", "legacy"].flatMap((tenantId) =>
            (["upsert", "replace"] as const).map((mode) => [tenantId, mode]),
        ),
    )(
        "plans the key chains of the %s folder in %s mode as unchanged after the startup import and keeps their keys",
        async (tenantId, mode) => {
            const items = await planKeyChains(tenantId, mode);
            expect(items.length).toBeGreaterThan(0);
            expect(
                items.map(({ id, action, changes }) => ({
                    id,
                    action,
                    changes,
                })),
            ).toEqual(
                items.map(({ id }) => ({
                    id,
                    action: "unchanged",
                    changes: [],
                })),
            );

            const before = await keyMaterial(tenantId);
            // What the next start with this CONFIG_IMPORT_MODE runs.
            await app
                .get(ConfigFolderBundleService)
                .applyTenantFolder(tenantId, mode);
            expect(await keyMaterial(tenantId)).toEqual(before);
        },
    );

    it("renews a generated certificate close to its expiry once", async () => {
        // The trust list key of the demo folder has no crt.
        const id = JSON.parse(
            readFileSync(
                join(configRoot, "demo", "key-chains", "trust-list.json"),
                "utf8",
            ),
        ).spec.id;
        const repository = app.get(DataSource).getRepository(KeyChainEntity);
        const row = await repository.findOneByOrFail({ tenantId: "demo", id });
        const { kty, crv, x, y, d } = row.activeJwk;
        const algorithm = { name: "ECDSA", namedCurve: "P-256" };
        const keys = {
            privateKey: await webcrypto.subtle.importKey(
                "jwk",
                { kty, crv, x, y, d },
                algorithm,
                true,
                ["sign"],
            ),
            publicKey: await webcrypto.subtle.importKey(
                "jwk",
                { kty, crv, x, y },
                algorithm,
                true,
                ["verify"],
            ),
        };
        const day = 24 * 60 * 60 * 1000;
        // A certificate as the import generates it, with the given days left.
        const plant = async (daysLeft: number) => {
            const certificate =
                await x509.X509CertificateGenerator.createSelfSigned(
                    {
                        serialNumber: "0a",
                        name: "CN=Demo Tenant",
                        notBefore: new Date(
                            Date.now() - (365 - daysLeft) * day,
                        ),
                        notAfter: new Date(Date.now() + daysLeft * day),
                        keys,
                        signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
                        extensions: [
                            new x509.SubjectAlternativeNameExtension([
                                {
                                    type: "dns",
                                    value: new URL(
                                        app
                                            .get(ConfigService)
                                            .getOrThrow<string>("PUBLIC_URL"),
                                    ).hostname,
                                },
                            ]),
                        ],
                    },
                    webcrypto as Crypto,
                );
            await repository.update(
                { tenantId: "demo", id },
                { activeCertificate: certificate.toString("pem") },
            );
        };
        const planned = async () =>
            (await planKeyChains("demo")).find(
                (candidate) => candidate.id === id,
            );

        // More than 90 days left: kept.
        await plant(120);
        expect(await planned()).toMatchObject({ action: "unchanged" });
        await plant(10);
        const item = await planned();
        expect(item).toMatchObject({ action: "update" });
        expect(item?.changes?.map(({ path }) => path)).toEqual(["/spec/crt/0"]);
        await app
            .get(ConfigFolderBundleService)
            .applyTenantFolder("demo", "upsert");
        const renewed = await repository.findOneByOrFail({
            tenantId: "demo",
            id,
        });
        expect(renewed.activeJwk).toMatchObject({ x, y });
        expect(
            new X509Certificate(
                renewed.activeCertificate,
            ).validToDate.getTime(),
        ).toBeGreaterThan(Date.now() + 300 * day);
        expect((await planned())?.action).toBe("unchanged");
    });

    it("still plans and applies a changed key, certificate or chain type", async () => {
        const folder = join(configRoot, "legacy", "key-chains");
        const read = (file: string) =>
            JSON.parse(readFileSync(join(folder, file), "utf8"));
        const write = (file: string, content: Record<string, unknown>) =>
            writeFileSync(join(folder, file), JSON.stringify(content));

        // A new private key.
        const trustList = read("trust-list.json");
        const { privateKey } = await generateKeyPair("ES256", {
            extractable: true,
        });
        const key = await exportJWK(privateKey);
        write("trust-list.json", { ...trustList, key });
        // Without its registrar-issued certificate, the import generates a
        // self-signed one.
        const { crt: registrarCertificates, ...access } = read("access.json");
        write("access.json", access);
        // Rotation off turns the internal chain into a standalone key.
        const attestation = read("attestation.json");
        write("attestation.json", {
            ...attestation,
            rotationPolicy: { enabled: false },
        });

        const changed = Object.fromEntries(
            (await planKeyChains("legacy")).map((item) => [
                item.id,
                {
                    action: item.action,
                    paths: item.changes?.map(({ path }) => path),
                },
            ]),
        );
        expect(changed).toMatchObject({
            // The import also generates a certificate for the new key.
            [trustList.id]: {
                action: "update",
                paths: ["/spec/crt/0", "/spec/keySource"],
            },
            [access.id]: { action: "update", paths: ["/spec/crt/0"] },
            [attestation.id]: {
                action: "update",
                paths: expect.arrayContaining([
                    "/spec/activeCertificate",
                    "/spec/keySource",
                    "/spec/rotationPolicy/enabled",
                ]),
            },
            [read("status-list.json").id]: { action: "unchanged" },
        });

        await app
            .get(ConfigFolderBundleService)
            .applyTenantFolder("legacy", "upsert");
        const stored = await app
            .get(DataSource)
            .getRepository(KeyChainEntity)
            .find({ where: { tenantId: "legacy" } });
        const byId = (id: string) => stored.find((row) => row.id === id)!;
        expect(byId(trustList.id).activeJwk).toMatchObject({
            x: key.x,
            y: key.y,
        });
        const accessCertificate = new X509Certificate(
            byId(access.id).activeCertificate,
        );
        expect(accessCertificate.issuer).toBe(accessCertificate.subject);
        expect(accessCertificate.raw.toString("base64")).not.toBe(
            registrarCertificates[0],
        );
        expect(byId(attestation.id).rootJwk).toBeNull();
        expect(byId(attestation.id).activeJwk).toMatchObject({
            x: attestation.key.x,
        });
        // Applied, the changed files plan as unchanged again.
        const replanned = await planKeyChains("legacy");
        expect(
            replanned.every((item) => item.action === "unchanged"),
            JSON.stringify(replanned, null, 2),
        ).toBe(true);
    });

    it("imports key chains without kmsProvider into the default provider of the bundle's KMS configuration", async () => {
        // Files without kmsProvider went into the default provider, db.
        const folder = join(configRoot, "legacy", "key-chains");
        const moved = readdirSync(folder)
            .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")))
            .filter((file) => !file.kmsProvider)
            .map((file) => file.id as string);
        expect(moved.length).toBeGreaterThan(0);
        const providers = [
            { id: "db", type: "db" },
            { id: "db2", type: "db" },
        ];
        // The key chains of the folder and a KMS configuration.
        const withKms = (spec: Record<string, unknown>) => {
            const folderBundle = app
                .get(ConfigFolderBundleService)
                .buildBundle("legacy", join(configRoot, "legacy"));
            const keyChains = folderBundle.manifest.resources.map(
                (resource) => resource.kind === "KeyChain",
            );
            folderBundle.documents = folderBundle.documents.filter(
                (_, index) => keyChains[index],
            );
            folderBundle.manifest.resources =
                folderBundle.manifest.resources.filter(
                    (_, index) => keyChains[index],
                );
            return addBundleDocument(folderBundle, {
                kind: "KmsConfig",
                id: "kms",
                path: "kms.json",
                spec,
            });
        };
        const plans = app.get(ConfigBundleService);
        const expectMove = async (
            bundle: ConfigBundle,
            before: string,
            after: string,
        ) => {
            const plan = await plans.plan("legacy", bundle, "upsert");
            expect(
                plan.items
                    .filter((item) => moved.includes(item.id))
                    .map(({ action, changes }) => ({ action, changes })),
            ).toEqual(
                moved.map(() => ({
                    action: "update",
                    changes: [{ path: "/spec/kmsProvider", before, after }],
                })),
            );
            await app
                .get(ConfigBundleApplyService)
                .apply(
                    "legacy",
                    bundle,
                    "upsert",
                    undefined,
                    plan.planFingerprint,
                );
            const stored = await app
                .get(DataSource)
                .getRepository(KeyChainEntity)
                .find({ where: { tenantId: "legacy" } });
            for (const id of moved)
                expect(stored.find((row) => row.id === id)?.kmsProvider).toBe(
                    after,
                );
            const replanned = await plans.plan("legacy", bundle, "upsert");
            expect(
                replanned.items
                    .filter((item) => item.kind === "KeyChain")
                    .every((item) => item.action === "unchanged"),
                JSON.stringify(replanned.items, null, 2),
            ).toBe(true);
        };

        await expectMove(
            withKms({ defaultProvider: "db2", providers }),
            "db",
            "db2",
        );
        // Without a default of its own, the tenant gets the global one.
        await expectMove(withKms({ providers }), "db2", "db");

        // A detached KMS configuration is skipped, so its default does not count.
        await app
            .get(DataSource)
            .getRepository(ConfigResourceMetadataEntity)
            .update(
                { tenantId: "legacy", kind: "KmsConfig" },
                { ownership: "detached" },
            );
        const detached = await plans.plan(
            "legacy",
            withKms({ defaultProvider: "db2", providers }),
            "upsert",
        );
        expect(
            detached.items.find((item) => item.kind === "KmsConfig")?.action,
        ).toBe("skip");
        expect(
            detached.items
                .filter((item) => item.kind === "KeyChain")
                .every((item) => item.action === "unchanged"),
            JSON.stringify(detached.items, null, 2),
        ).toBe(true);
    });
});
