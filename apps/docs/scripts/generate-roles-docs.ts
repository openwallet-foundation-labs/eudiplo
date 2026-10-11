import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type EndpointDoc, readEndpoints, readRoles } from "./roles-docs/model.js";

/**
 * Generates docs/_generated/roles.json for <RoleReference /> (reference/roles.md):
 * the roles of apps/backend/src/auth/roles/role.enum.ts with their comments, and
 * every management endpoint guarded by @Secured([...]) with the roles it accepts
 * and whether one or all of them are needed.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendSrc = resolve(scriptDir, "../../backend/src");
const roleEnumFile = join(backendSrc, "auth/roles/role.enum.ts");
const outputFile = resolve(scriptDir, "../docs/_generated/roles.json");

async function controllerFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".controller.ts"))
        .map((entry) => join(entry.parentPath, entry.name))
        .sort();
}

async function main() {
    const roles = readRoles(roleEnumFile, await fs.readFile(roleEnumFile, "utf8"));
    const roleValues = new Map(roles.map((role) => [role.name, role.value]));
    const endpoints: EndpointDoc[] = [];
    for (const file of await controllerFiles(backendSrc)) {
        endpoints.push(...readEndpoints(file, await fs.readFile(file, "utf8"), roleValues));
    }
    endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    await fs.mkdir(dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, `${JSON.stringify({ roles, endpoints }, null, 2)}\n`, "utf8");
    console.log(`Generated ${roles.length} roles and ${endpoints.length} secured endpoints -> ${outputFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
