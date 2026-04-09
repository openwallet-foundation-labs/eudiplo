#!/usr/bin/env ts-node
/**
 * Fetch OpenID Credential Issuer metadata and generate presentation config templates.
 *
 * Usage:
 *   ts-node scripts/issuer-to-presentation.ts --url https://issuer.example.com
 *   ts-node scripts/issuer-to-presentation.ts --url https://issuer.example.com --select pid,diploma
 *   ts-node scripts/issuer-to-presentation.ts --url https://issuer.example.com --out presentation.json
 *
 * Flags:
 *   --url <string>      OpenID Credential Issuer URL (required)
 *   --select <ids>      Comma-separated credential configuration IDs to include
 *   --out <file>        Output file for the generated presentation config
 *   --list              Only list available credentials (no generation)
 *
 * The issuer URL can be:
 *   - The credential issuer base URL (e.g., https://issuer.example.com/issuers/tenant)
 *   - The well-known URL directly (e.g., https://issuer.example.com/.well-known/openid-credential-issuer/issuers/tenant)
 */

import { writeFile } from "node:fs/promises";
import fetch from "cross-fetch";

// Types for OID4VCI metadata
interface CredentialConfiguration {
    format: string;
    scope?: string;
    vct?: string;
    doctype?: string;
    display?: Array<{
        name?: string;
        description?: string;
        locale?: string;
    }>;
    claims?: Record<string, unknown>;
    credential_definition?: {
        type?: string[];
        vct?: string;
    };
}

interface IssuerMetadata {
    credential_issuer: string;
    credential_configurations_supported?: Record<string, CredentialConfiguration>;
    credentials_supported?: CredentialConfiguration[]; // Legacy format
}

// Types for presentation config (DCQL)
interface DcqlClaim {
    path: string[];
    intent_to_retain?: boolean;
}

interface DcqlCredential {
    id: string;
    format: string;
    meta?: {
        vct_values?: string[];
        doctype_value?: string;
    };
    claims?: DcqlClaim[];
}

interface PresentationConfig {
    id: string;
    description: string;
    dcql_query: {
        credentials: DcqlCredential[];
        credential_sets?: Array<{
            options: string[][];
        }>;
    };
    lifeTime: number;
}

function arg(name: string, fallback?: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
        return process.argv[i + 1];
    }
    return fallback;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

async function fetchIssuerMetadata(url: string): Promise<IssuerMetadata> {
    // Determine the well-known URL
    let wellKnownUrl: string;
    if (url.includes(".well-known/openid-credential-issuer")) {
        wellKnownUrl = url;
    } else {
        // Extract the path after the base and construct well-known URL
        const urlObj = new URL(url);
        const basePath = urlObj.pathname;
        wellKnownUrl = `${urlObj.origin}/.well-known/openid-credential-issuer${basePath}`;
    }

    console.log(`\n🔍 Fetching issuer metadata from:\n   ${wellKnownUrl}\n`);

    const res = await fetch(wellKnownUrl, {
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch issuer metadata: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

function extractCredentialType(config: CredentialConfiguration): string | undefined {
    // SD-JWT VC: vct field
    if (config.vct) return config.vct;
    if (config.credential_definition?.vct) return config.credential_definition.vct;

    // mDOC: doctype field
    if (config.doctype) return config.doctype;

    return undefined;
}

function formatCredentialInfo(id: string, config: CredentialConfiguration): string {
    const format = config.format;
    const type = extractCredentialType(config);
    const name = config.display?.[0]?.name || id;
    const description = config.display?.[0]?.description || "";

    let info = `  📄 ${id}`;
    info += `\n     Format: ${format}`;
    if (type) info += `\n     Type: ${type}`;
    info += `\n     Name: ${name}`;
    if (description) info += `\n     Description: ${description}`;
    if (config.scope) info += `\n     Scope: ${config.scope}`;

    return info;
}

function generateDcqlCredential(id: string, config: CredentialConfiguration): DcqlCredential {
    const credential: DcqlCredential = {
        id,
        format: config.format,
    };

    // Add meta based on format
    const type = extractCredentialType(config);
    if (type) {
        if (config.format === "dc+sd-jwt" || config.format === "vc+sd-jwt") {
            credential.meta = { vct_values: [type] };
        } else if (config.format === "mso_mdoc") {
            credential.meta = { doctype_value: type };
        }
    }

    // Generate claims from the config if available
    if (config.claims) {
        credential.claims = generateClaimsFromSchema(config.claims, config.format, type);
    }

    return credential;
}

function generateClaimsFromSchema(
    claims: Record<string, unknown>,
    format: string,
    doctype?: string
): DcqlClaim[] {
    const dcqlClaims: DcqlClaim[] = [];

    for (const [key, value] of Object.entries(claims)) {
        if (format === "mso_mdoc" && doctype) {
            // mDOC claims need namespace prefix
            dcqlClaims.push({
                path: [doctype, key],
                intent_to_retain: false,
            });
        } else {
            // SD-JWT claims are direct paths
            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Nested object - add nested claims
                for (const nestedKey of Object.keys(value as Record<string, unknown>)) {
                    dcqlClaims.push({ path: [key, nestedKey] });
                }
            } else {
                dcqlClaims.push({ path: [key] });
            }
        }
    }

    return dcqlClaims;
}

function generatePresentationConfig(
    credentials: Array<{ id: string; config: CredentialConfiguration }>,
    configId?: string
): PresentationConfig {
    const id = configId || credentials.map((c) => c.id).join("-and-");

    const dcqlCredentials = credentials.map(({ id, config }) =>
        generateDcqlCredential(id, config)
    );

    const config: PresentationConfig = {
        id,
        description: `Presentation for verifying ${credentials.map((c) => c.config.display?.[0]?.name || c.id).join(" and ")}`,
        dcql_query: {
            credentials: dcqlCredentials,
        },
        lifeTime: 300,
    };

    // If multiple credentials, add credential_sets with all as required
    if (credentials.length > 1) {
        config.dcql_query.credential_sets = [
            {
                options: [dcqlCredentials.map((c) => c.id)],
            },
        ];
    }

    return config;
}

async function main() {
    const url = arg("url");
    const selectIds = arg("select")?.split(",").map((s) => s.trim());
    const outFile = arg("out");
    const listOnly = hasFlag("list");

    if (!url) {
        console.error("Error: --url is required");
        console.error("\nUsage:");
        console.error("  ts-node scripts/issuer-to-presentation.ts --url <issuer-url>");
        console.error("  ts-node scripts/issuer-to-presentation.ts --url <issuer-url> --list");
        console.error("  ts-node scripts/issuer-to-presentation.ts --url <issuer-url> --select pid,diploma");
        console.error("  ts-node scripts/issuer-to-presentation.ts --url <issuer-url> --select pid --out presentation.json");
        process.exit(1);
    }

    try {
        const metadata = await fetchIssuerMetadata(url);

        console.log(`✅ Credential Issuer: ${metadata.credential_issuer}\n`);

        // Get credential configurations
        const configs = metadata.credential_configurations_supported || {};
        const configEntries = Object.entries(configs);

        if (configEntries.length === 0) {
            console.log("⚠️  No credential configurations found in issuer metadata.");
            process.exit(0);
        }

        console.log(`📋 Available Credentials (${configEntries.length}):\n`);
        for (const [id, config] of configEntries) {
            console.log(formatCredentialInfo(id, config));
            console.log();
        }

        if (listOnly) {
            process.exit(0);
        }

        // Determine which credentials to include
        let selectedCredentials: Array<{ id: string; config: CredentialConfiguration }>;

        if (selectIds) {
            selectedCredentials = selectIds
                .filter((id) => {
                    if (!configs[id]) {
                        console.warn(`⚠️  Credential "${id}" not found in issuer metadata, skipping.`);
                        return false;
                    }
                    return true;
                })
                .map((id) => ({ id, config: configs[id] }));

            if (selectedCredentials.length === 0) {
                console.error("❌ No valid credentials selected.");
                process.exit(1);
            }
        } else {
            // Default: include all credentials
            selectedCredentials = configEntries.map(([id, config]) => ({ id, config }));
        }

        console.log(`\n🛠️  Generating presentation config for: ${selectedCredentials.map((c) => c.id).join(", ")}\n`);

        const presentationConfig = generatePresentationConfig(selectedCredentials);
        const jsonOutput = JSON.stringify(presentationConfig, null, 4);

        if (outFile) {
            await writeFile(outFile, jsonOutput, "utf8");
            console.log(`✅ Presentation config saved to: ${outFile}`);
        } else {
            console.log("📄 Generated Presentation Config:\n");
            console.log(jsonOutput);
        }

        console.log("\n💡 Tips:");
        console.log("   - Add 'claims' arrays to specify which attributes to request");
        console.log("   - Add 'trusted_authorities' for trust chain verification");
        console.log("   - Use 'credential_sets' with 'options' for alternative credential combinations");
        console.log("   - Adjust 'lifeTime' (in seconds) based on your use case");

    } catch (error) {
        console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }
}

main();
