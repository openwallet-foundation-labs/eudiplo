import {
    lstat,
    mkdir,
    mkdtemp,
    readdir,
    readFile,
    stat,
    symlink,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/runtime.js";
import {
    loadConfig,
    redactUrl,
    removeInstance,
    renameInstance,
    saveConfig,
    updateInstance,
} from "../src/services/cli-config.js";
import type { CliConfig, CommandContext } from "../src/types.js";

const production = {
    target: "external" as const,
    url: "https://eudiplo.example.com",
};
const staging = {
    target: "external" as const,
    url: "https://staging.example.com",
    clientUrl: "https://client.staging.example.com",
};

describe("eudiplo instance lifecycle", () => {
    describe("list", () => {
        it("reports an empty registry", async () => {
            const { context, output } = await createContext();

            expect(await runCli(["instance", "list"], context)).toBe(0);
            expect(output.stdout).toBe("No configured instances.\n");
        });

        it("marks the default and the deployment target", async () => {
            const { context, output } = await createContext({
                defaultInstance: "staging",
                instances: {
                    production,
                    staging,
                    local: { target: "compose", url: "http://localhost:3000" },
                },
            });

            expect(await runCli(["instance", "list"], context)).toBe(0);
            expect(output.stdout).toBe(
                [
                    "Configured instances:",
                    "- local: compose http://localhost:3000",
                    "- production: external https://eudiplo.example.com",
                    "- staging (default): external https://staging.example.com",
                    "",
                ].join("\n"),
            );
        });

        it("never prints credentials embedded in URLs", async () => {
            const { context, output } = await createContext({
                defaultInstance: "production",
                instances: {
                    production: {
                        target: "external",
                        url: "https://admin:s3cret@eudiplo.example.com",
                        clientUrl: "https://token@client.example.com/app",
                    },
                    // The URL parser accepts user info without "//".
                    legacy: {
                        target: "external",
                        url: "https:admin:s3cret@legacy.example.com",
                    },
                },
            });

            expect(await runCli(["instance", "ls"], context)).toBe(0);
            expect(await runCli(["instance", "show"], context)).toBe(0);
            expect(await runCli(["config", "validate"], context)).toBe(0);
            expect(output.stdout).not.toContain("admin");
            expect(output.stdout).not.toContain("s3cret");
            expect(output.stdout).not.toContain("token");
            expect(output.stdout).toContain(
                "API URL: https://***@eudiplo.example.com",
            );
            expect(output.stdout).toContain(
                "Client URL: https://***@client.example.com/app",
            );
            expect(output.stdout).toContain(
                "- legacy: external https://***@legacy.example.com/",
            );
        });

        it("never prints credentials in doctor or status output", async () => {
            const config = {
                defaultInstance: "production",
                instances: {
                    production: {
                        target: "external" as const,
                        url: "https://admin:s3cret@eudiplo.example.com",
                        clientUrl: "https:token:t0ken@client.example.com",
                    },
                },
            };
            // Like Node's fetch: refuse URLs with user info, repeating the URL.
            const refusing: typeof fetch = async (input) => {
                throw new TypeError(
                    `Request cannot be constructed from a URL that includes credentials: ${String(input)}`,
                );
            };
            const answering: typeof fetch = async () =>
                new Response("{}", { status: 200 });

            for (const fakeFetch of [refusing, answering]) {
                const { context, output } = await createContext(config, {
                    fetch: fakeFetch,
                });
                await runCli(["doctor"], context);
                await runCli(["status"], context);
                const printed = output.stdout + output.stderr;

                expect(printed).not.toContain("admin");
                expect(printed).not.toContain("s3cret");
                expect(printed).not.toContain("t0ken");
                expect(printed).toContain("https://***@eudiplo.example.com/");
            }
        });
    });

    describe("show", () => {
        it("rejects unknown names, including Object members", async () => {
            const { context, output } = await createContext({
                defaultInstance: "production",
                instances: { production },
            });

            for (const name of ["missing", "constructor", "__proto__"]) {
                output.stderr = "";
                expect(await runCli(["instance", "show", name], context)).toBe(
                    1,
                );
                expect(output.stderr).toContain(`Unknown instance: ${name}`);
            }
        });

        it("rejects Object members passed to --instance", async () => {
            const { context, output } = await createContext({
                defaultInstance: "production",
                instances: { production },
            });

            expect(
                await runCli(["status", "--instance", "toString"], context),
            ).toBe(1);
            expect(output.stderr).toContain("Unknown instance: toString");
        });
    });

    describe("add", () => {
        it("rejects non-HTTP(S) URLs before writing the config", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production },
            });
            const before = await readFile(configPath, "utf8");

            expect(
                await runCli(
                    ["instance", "add", "bad", "--url", "ftp://example.com"],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain(
                "--url must be an absolute HTTP(S) URL.",
            );
            expect(
                await runCli(
                    [
                        "instance",
                        "add",
                        "bad",
                        "--url",
                        "https://eudiplo.example.com",
                        "--client-url",
                        "not a url",
                    ],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain(
                "--client-url must be an absolute HTTP(S) URL.",
            );
            expect(await readFile(configPath, "utf8")).toBe(before);

            // The registry still loads, so other commands keep working.
            expect(await runCli(["instance", "ls"], context)).toBe(0);
        });

        it("makes the first instance the default, as before", async () => {
            const { context, configPath } = await createContext();

            expect(
                await runCli(
                    ["instance", "add", "only", "--url", production.url],
                    context,
                ),
            ).toBe(0);
            expect(await readConfig(configPath)).toEqual({
                defaultInstance: "only",
                instances: { only: production },
            });
        });
    });

    describe("names like Object members", () => {
        it("keeps an instance renamed to __proto__", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production, staging },
            });

            expect(
                await runCli(
                    ["instance", "rename", "staging", "__proto__"],
                    context,
                ),
            ).toBe(0);
            const saved = await readFile(configPath, "utf8");
            expect(Object.keys(JSON.parse(saved).instances)).toEqual([
                "production",
                "__proto__",
            ]);

            output.stdout = "";
            expect(await runCli(["instance", "ls"], context)).toBe(0);
            expect(output.stdout).toContain(
                "- __proto__: external https://staging.example.com",
            );
            expect(
                await runCli(["instance", "use", "__proto__"], context),
            ).toBe(0);
            expect(await runCli(["instance", "show"], context)).toBe(0);
            expect(output.stdout).toContain("Instance __proto__ (default)");
            expect(
                await runCli(
                    ["instance", "rename", "__proto__", "staging"],
                    context,
                ),
            ).toBe(0);
            expect(await readConfig(configPath)).toEqual({
                defaultInstance: "staging",
                instances: { production, staging },
            });
        });

        it("adds and loads an instance named __proto__", async () => {
            const { context, configPath } = await createContext();

            expect(
                await runCli(
                    ["instance", "add", "__proto__", "--url", production.url],
                    context,
                ),
            ).toBe(0);
            const loaded = await loadConfig(configPath);
            expect(loaded.defaultInstance).toBe("__proto__");
            expect(Object.hasOwn(loaded.instances, "__proto__")).toBe(true);
            expect(Object.getPrototypeOf(loaded.instances)).toBe(
                Object.prototype,
            );
        });
    });

    describe("update", () => {
        it("changes the API and client URLs and keeps other fields", async () => {
            const kubernetes = {
                target: "kubernetes" as const,
                url: "https://k8s.example.com",
                context: "prod",
                namespace: "eudiplo",
                workloads: { backend: "deployment/eudiplo" },
                readOnly: true,
            };
            const { context, output, configPath } = await createContext({
                defaultInstance: "cluster",
                instances: { cluster: kubernetes },
            });

            expect(
                await runCli(
                    [
                        "instance",
                        "update",
                        "cluster",
                        "--url",
                        "https://k8s2.example.com",
                        "--client-url",
                        "https://client.k8s.example.com",
                    ],
                    context,
                ),
            ).toBe(0);
            expect(output.stdout).toBe("Updated instance cluster.\n");
            expect(await readConfig(configPath)).toEqual({
                defaultInstance: "cluster",
                instances: {
                    cluster: {
                        ...kubernetes,
                        url: "https://k8s2.example.com",
                        clientUrl: "https://client.k8s.example.com",
                    },
                },
            });
        });

        it("removes the client URL with --no-client-url", async () => {
            const { context, configPath } = await createContext({
                defaultInstance: "staging",
                instances: { staging },
            });

            expect(
                await runCli(
                    ["instance", "update", "staging", "--no-client-url"],
                    context,
                ),
            ).toBe(0);
            expect((await readConfig(configPath)).instances.staging).toEqual({
                target: "external",
                url: staging.url,
            });
        });

        it("validates URLs like instance add", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "staging",
                instances: { staging },
            });
            const before = await readFile(configPath, "utf8");

            expect(
                await runCli(
                    ["instance", "update", "staging", "--url", "file:///etc"],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain(
                "--url must be an absolute HTTP(S) URL.",
            );
            expect(await readFile(configPath, "utf8")).toBe(before);
        });

        it("requires a change and a known instance", async () => {
            const { context, output } = await createContext({
                defaultInstance: "staging",
                instances: { staging },
            });

            expect(
                await runCli(["instance", "update", "staging"], context),
            ).toBe(1);
            expect(output.stderr).toContain("Nothing to update.");
            expect(
                await runCli(
                    ["instance", "update", "missing", "--url", staging.url],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain("Unknown instance: missing");
        });
    });

    describe("rename", () => {
        it("moves the default along with the instance", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "prod",
                instances: { prod: production, staging },
            });

            expect(
                await runCli(
                    ["instance", "rename", "prod", "production"],
                    context,
                ),
            ).toBe(0);
            expect(output.stdout).toContain(
                "Renamed instance prod to production.",
            );
            expect(output.stdout).toContain(
                "Default instance is now production.",
            );
            const config = await readConfig(configPath);
            expect(config).toEqual({
                defaultInstance: "production",
                instances: { production, staging },
            });
            // The renamed entry keeps its place in the file.
            expect(Object.keys(config.instances)).toEqual([
                "production",
                "staging",
            ]);
        });

        it("keeps the default when renaming another instance", async () => {
            const { context, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production, stage: staging },
            });

            expect(
                await runCli(
                    ["instance", "rename", "stage", "staging"],
                    context,
                ),
            ).toBe(0);
            expect(await readConfig(configPath)).toEqual({
                defaultInstance: "production",
                instances: { production, staging },
            });
        });

        it("refuses to overwrite or rename unknown instances", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production, staging },
            });
            const before = await readFile(configPath, "utf8");

            expect(
                await runCli(
                    ["instance", "rename", "staging", "production"],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain(
                "Instance production already exists.",
            );
            expect(
                await runCli(["instance", "rename", "missing", "x"], context),
            ).toBe(1);
            expect(output.stderr).toContain("Unknown instance: missing");
            expect(await readFile(configPath, "utf8")).toBe(before);
        });
    });

    describe("remove", () => {
        it("removes the default when another default is given", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production, staging },
            });

            expect(
                await runCli(
                    [
                        "instance",
                        "remove",
                        "production",
                        "--default",
                        "staging",
                    ],
                    context,
                ),
            ).toBe(0);
            expect(output.stdout).toContain(
                "Unregistered instance production.",
            );
            expect(output.stdout).toContain("Default instance set to staging.");
            expect(await readConfig(configPath)).toEqual({
                defaultInstance: "staging",
                instances: { staging },
            });
        });

        it("never leaves a dangling default", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production, staging },
            });
            const before = await readFile(configPath, "utf8");

            expect(
                await runCli(["instance", "remove", "production"], context),
            ).toBe(1);
            expect(output.stderr).toContain("pass --default <name>");
            expect(
                await runCli(
                    ["instance", "rm", "production", "--default", "production"],
                    context,
                ),
            ).toBe(1);
            expect(
                await runCli(
                    ["instance", "rm", "production", "--default", "missing"],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain("Unknown instance: missing");
            expect(await readFile(configPath, "utf8")).toBe(before);
        });

        it("refuses --default when another instance is removed", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: {
                    production,
                    staging,
                    old: { target: "external", url: "https://old.example.com" },
                },
            });
            const before = await readFile(configPath, "utf8");

            expect(
                await runCli(
                    ["instance", "rm", "old", "--default", "staging"],
                    context,
                ),
            ).toBe(1);
            expect(output.stderr).toContain(
                "--default only applies when removing the default instance (production).",
            );
            expect(output.stderr).toContain("eudiplo instance use <name>");
            expect(await readFile(configPath, "utf8")).toBe(before);
        });

        it("refuses --default when no default is set", () => {
            expect(() =>
                removeInstance(
                    { instances: { production, staging } },
                    "production",
                    { newDefault: "staging" },
                ),
            ).toThrow(
                "--default only applies when removing the default instance.",
            );
        });

        it("clears the default when the last instance is removed", async () => {
            const { context, output, configPath } = await createContext({
                defaultInstance: "production",
                instances: { production },
            });

            expect(
                await runCli(["instance", "remove", "production"], context),
            ).toBe(0);
            expect(output.stdout).toContain("No default instance is set.");
            expect(await readConfig(configPath)).toEqual({ instances: {} });
        });

        it("rejects unknown instances", async () => {
            const { context, output } = await createContext();

            expect(await runCli(["instance", "rm", "missing"], context)).toBe(
                1,
            );
            expect(output.stderr).toContain("Unknown instance: missing");
        });
    });

    it("completes instance names for remove --default", async () => {
        const { context, output } = await createContext({
            defaultInstance: "production",
            instances: { production, staging },
        });

        expect(
            await runCli(
                ["_complete", "instance", "remove", "production", "--default"],
                context,
            ),
        ).toBe(0);
        expect(output.stdout).toContain("staging\n");
    });
});

describe("CLI config writes", () => {
    it("writes atomically with mode 0600 and leaves no temporary files", async () => {
        const configPath = join(
            await mkdtemp(join(tmpdir(), "eudiplo-cli-config-")),
            "nested",
            "config.json",
        );

        await saveConfig(configPath, {
            defaultInstance: "production",
            instances: { production },
        });
        await saveConfig(configPath, {
            defaultInstance: "staging",
            instances: { staging },
        });

        expect(await readdir(dirname(configPath))).toEqual(["config.json"]);
        expect(await loadConfig(configPath)).toMatchObject({
            defaultInstance: "staging",
        });
        if (process.platform !== "win32") {
            expect((await stat(configPath)).mode & 0o777).toBe(0o600);
        }
    });

    it.skipIf(process.platform === "win32")(
        "keeps a symlinked config a symlink and writes its target",
        async () => {
            const root = await mkdtemp(join(tmpdir(), "eudiplo-cli-link-"));
            const target = join(root, "dotfiles", "eudiplo.json");
            const link = join(root, "home", "config.json");
            await saveConfig(target, { instances: { production } });
            await mkdir(dirname(link));
            await symlink(target, link);

            await saveConfig(link, {
                defaultInstance: "staging",
                instances: { staging },
            });

            expect((await lstat(link)).isSymbolicLink()).toBe(true);
            expect(await readConfig(target)).toEqual({
                defaultInstance: "staging",
                instances: { staging },
            });
            expect(await readdir(dirname(target))).toEqual(["eudiplo.json"]);
            expect((await stat(target)).mode & 0o777).toBe(0o600);
        },
    );

    it.skipIf(process.platform === "win32")(
        "creates the missing target of a dangling symlink",
        async () => {
            const root = await mkdtemp(join(tmpdir(), "eudiplo-cli-link-"));
            const link = join(root, "config.json");
            await symlink("dotfiles/eudiplo.json", link);

            await saveConfig(link, { instances: { production } });

            expect((await lstat(link)).isSymbolicLink()).toBe(true);
            expect(
                await readConfig(join(root, "dotfiles", "eudiplo.json")),
            ).toEqual({ instances: { production } });
        },
    );

    it("refuses to save a config that would not load again", async () => {
        const configPath = join(
            await mkdtemp(join(tmpdir(), "eudiplo-cli-config-")),
            "config.json",
        );
        await saveConfig(configPath, { instances: { production } });

        await expect(
            saveConfig(configPath, {
                defaultInstance: "missing",
                instances: { production },
            }),
        ).rejects.toThrow("Default instance missing is not defined");
        await expect(
            saveConfig(configPath, {
                instances: {
                    production: { target: "external", url: "ftp://x" },
                },
            }),
        ).rejects.toThrow("must be an absolute HTTP(S) URL");

        expect(await readdir(dirname(configPath))).toEqual(["config.json"]);
        expect(await loadConfig(configPath)).toEqual({
            defaultInstance: undefined,
            instances: { production: expect.objectContaining(production) },
        });
    });

    it("keeps config transforms pure", () => {
        const config: CliConfig = {
            defaultInstance: "production",
            instances: { production, staging },
        };
        const snapshot = structuredClone(config);

        updateInstance(config, "staging", { clientUrl: null });
        renameInstance(config, "production", "prod");
        removeInstance(config, "staging");

        expect(config).toEqual(snapshot);
    });

    it("redacts only URLs that carry user info", () => {
        expect(redactUrl("https://eudiplo.example.com")).toBe(
            "https://eudiplo.example.com",
        );
        expect(redactUrl("http://localhost:3000/api?x=@y")).toBe(
            "http://localhost:3000/api?x=@y",
        );
        expect(redactUrl("https://user@example.com/")).toBe(
            "https://***@example.com/",
        );
        expect(redactUrl("https://user:p%40ss@example.com:8443/api")).toBe(
            "https://***@example.com:8443/api",
        );
    });

    it("redacts user info the URL parser accepts without //", () => {
        expect(redactUrl("https:admin:secret@api.example.com")).toBe(
            "https://***@api.example.com/",
        );
        expect(redactUrl("https:/admin:secret@api.example.com/v1")).toBe(
            "https://***@api.example.com/v1",
        );
        expect(redactUrl("HTTPS://Admin:Secret@API.example.com")).toBe(
            "https://***@api.example.com/",
        );
    });

    it("hides values that are not URLs but could carry user info", () => {
        expect(redactUrl("//admin:secret@api.example.com")).toBe("***");
        expect(redactUrl("not a url")).toBe("not a url");
    });
});

async function createContext(
    config?: CliConfig,
    options: { fetch?: typeof fetch } = {},
) {
    const home = await mkdtemp(join(tmpdir(), "eudiplo-cli-home-"));
    const configPath = join(home, "config.json");
    if (config) {
        await writeFile(configPath, `${JSON.stringify(config, null, 4)}\n`);
    }
    const output = { stdout: "", stderr: "" };
    const context: CommandContext = {
        cwd: home,
        env: { EUDIPLO_CLI_CONFIG: configPath, PATH: process.env.PATH },
        stdout: {
            write(chunk: string | Uint8Array) {
                output.stdout += String(chunk);
                return true;
            },
        },
        stderr: {
            write(chunk: string | Uint8Array) {
                output.stderr += String(chunk);
                return true;
            },
        },
        fetch:
            options.fetch ??
            (async () => {
                throw new Error(
                    "Unexpected network request in instance tests.",
                );
            }),
        // Never open a real TLS socket from the test suite.
        readCertificate: async () => ({
            subject: "eudiplo.example.com",
            issuer: "Test CA",
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }),
    };
    return { context, output, configPath };
}

async function readConfig(configPath: string): Promise<CliConfig> {
    return JSON.parse(await readFile(configPath, "utf8"));
}
