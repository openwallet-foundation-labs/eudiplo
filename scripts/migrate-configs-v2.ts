import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import process from "node:process";
import { convertV1ToV2, type CredentialConfigV1 } from "../packages/eudiplo-sdk-core/src/config";

interface CliOptions {
  rootPath: string;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes("--dry-run");
  const firstPathArg = rawArgs.find((arg) => arg !== "--dry-run");

  return {
    rootPath: resolve(process.cwd(), firstPathArg ?? "assets/config"),
    dryRun,
  };
}

async function walkJsonFiles(path: string): Promise<string[]> {
  const info = await stat(path);
  if (info.isFile()) {
    return path.endsWith(".json") ? [path] : [];
  }

  const children = await readdir(path);
  const files: string[] = [];

  for (const child of children) {
    const childPath = resolve(path, child);
    const childStat = await stat(childPath);

    if (childStat.isDirectory()) {
      files.push(...(await walkJsonFiles(childPath)));
      continue;
    }

    if (childPath.endsWith(".json")) {
      files.push(childPath);
    }
  }

  return files;
}

function isCredentialConfigLike(input: unknown): input is CredentialConfigV1 {
  if (!input || typeof input !== "object") {
    return false;
  }

  const record = input as Record<string, unknown>;
  const config = record.config;
  if (!config || typeof config !== "object") {
    return false;
  }

  const format = (config as Record<string, unknown>).format;
  return format === "dc+sd-jwt" || format === "mso_mdoc";
}

function isAlreadyV2(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }

  return (input as Record<string, unknown>).configVersion === 2;
}

function printSimpleDiff(before: string, after: string, filePath: string): void {
  if (before === after) {
    return;
  }

  console.log(`\n--- ${filePath}`);
  console.log(`+++ ${filePath}`);

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);

  for (let index = 0; index < max; index += 1) {
    const left = beforeLines[index];
    const right = afterLines[index];

    if (left === right) {
      continue;
    }

    if (left !== undefined) {
      console.log(`-${left}`);
    }
    if (right !== undefined) {
      console.log(`+${right}`);
    }
  }
}

async function migrateFile(filePath: string, options: CliOptions): Promise<"skipped" | "updated"> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (isAlreadyV2(parsed) || !isCredentialConfigLike(parsed)) {
    return "skipped";
  }

  const converted = convertV1ToV2(parsed);
  const output = `${JSON.stringify(converted, null, 2)}\n`;

  if (options.dryRun) {
    printSimpleDiff(raw, output, relative(process.cwd(), filePath));
    return "updated";
  }

  await writeFile(filePath, output, "utf-8");
  return "updated";
}

async function main(): Promise<void> {
  const options = parseArgs();
  const files = await walkJsonFiles(options.rootPath);

  let updated = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const result = await migrateFile(filePath, options);
      if (result === "updated") {
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      console.error(`Failed to migrate ${relative(process.cwd(), filePath)}`);
      console.error(error);
      process.exit(1);
    }
  }

  const mode = options.dryRun ? "dry-run" : "write";
  console.log(`\nMigration completed (${mode}): updated=${updated}, skipped=${skipped}`);
}

void main();
