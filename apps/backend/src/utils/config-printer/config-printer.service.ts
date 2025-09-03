import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VALIDATION_SCHEMA } from "./combined.schema";
import { extractConditionsFromKeyDesc, flattenMetas } from "./helpers";

type Presence = "required" | "optional" | "";

export interface ConfigItem {
    key: string;
    value: unknown;
    shown: string;
    group: string;
    order: number;
    description: string;
    presence: Presence;
    usedDefault: boolean;
    secret: boolean;
    conditions: string[];
    meta: Record<string, any>;
}

export interface ConfigGroup {
    name: string;
    order: number;
    items: ConfigItem[];
}

export interface ConfigModel {
    createdAt: string;
    groups: ConfigGroup[];
    all: ConfigItem[];
}

/**
 * Service for printing configuration.
 */
@Injectable()
export class ConfigPrinterService implements OnModuleInit {
    constructor(private readonly cfg: ConfigService) {}

    /**
     * Builds the configuration model.
     * @returns The configuration model.
     */
    public buildModel(): ConfigModel {
        const described = VALIDATION_SCHEMA.describe() as any;
        const descKeys: Record<string, any> = described.keys ?? {};
        const allKeys = Object.keys(descKeys);
        const showAdvanced = this.cfg.get("CONFIG_PRINT_ADVANCED") === "true";
        const docGenerate = !!process.env.DOC_GENERATE;

        const items: ConfigItem[] = [];
        for (const key of allKeys) {
            const keyDesc = descKeys[key] ?? {};
            const flags = keyDesc.flags ?? {};
            const meta = flattenMetas(keyDesc);

            const group = meta.group ?? "Other";
            const order = Number.isFinite(meta.order)
                ? Number(meta.order)
                : 999;
            const advanced = meta.advanced === true;
            const secret = meta.secret === true;
            if (advanced && !showAdvanced) continue;

            const description =
                flags.description ||
                (Array.isArray(keyDesc.notes) ? keyDesc.notes.join(" ") : "") ||
                "";

            const presence: Presence =
                flags.presence === "required"
                    ? "required"
                    : flags.presence === "optional"
                      ? "optional"
                      : "";

            const value = this.cfg.get(key);
            const shown = docGenerate
                ? "" // Hide value when DOC_GENERATE is set
                : value === undefined
                  ? "(unset)"
                  : secret
                    ? "***"
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

            const usedDefault =
                !(key in process.env) && Object.hasOwn.call(flags, "default");

            const conditions = extractConditionsFromKeyDesc(keyDesc);

            items.push({
                key,
                value,
                shown,
                group,
                order,
                description,
                presence,
                usedDefault,
                secret,
                conditions,
                meta,
            });
        }

        // Group and sort
        const groupsMap = new Map<string, ConfigItem[]>();
        for (const i of items) {
            const arr = groupsMap.get(i.group) ?? [];
            arr.push(i);
            groupsMap.set(i.group, arr);
        }

        const groups: ConfigGroup[] = Array.from(groupsMap.entries())
            .map(([name, arr]) => {
                arr.sort(
                    (a, b) => a.order - b.order || a.key.localeCompare(b.key),
                );
                const order = arr.reduce((m, r) => Math.min(m, r.order), 999);
                return { name, order, items: arr };
            })
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

        return {
            createdAt: new Date().toISOString(),
            groups,
            all: items,
        };
    }

    /**
     * Generates notes for a configuration item.
     * @param i - The configuration item to generate notes for.
     * @returns The generated notes as a string.
     */
    private itemNotes(i: ConfigItem): string {
        const presence = i.presence ? ` [${i.presence}]` : "";
        const defTag = i.usedDefault ? " (default)" : "";
        const conds = i.conditions.map((c) => `[${c}]`).join(" ");
        const extra = [
            i.meta?.deprecated ? `(deprecated: ${i.meta.deprecated})` : "",
            i.meta?.restartRequired ? "(restart required)" : "",
            i.meta?.docUrl ? `(docs: ${i.meta.docUrl})` : "",
            i.meta?.example ? `(e.g. ${i.meta.example})` : "",
        ]
            .filter(Boolean)
            .join(" ");

        return [i.description, presence, defTag, conds, extra]
            .filter(Boolean)
            .join(" ")
            .trim();
    }

    /**
     * Renders the configuration model as plain text.
     * @param model - The configuration model to render.
     * @returns The rendered configuration as a plain text string.
     */
    private renderText(model: ConfigModel): string {
        const out: string[] = [];
        for (const g of model.groups) {
            out.push(`\n=== ${g.name} ===`);
            for (const i of g.items) {
                out.push(
                    `${i.key.padEnd(28)} = ${String(i.shown).padEnd(24)}  # ${this.itemNotes(i)}`,
                );
            }
        }
        return `\n${out.join("\n")}\n`;
    }

    /**
     * Renders the configuration model as Markdown.
     * @param model - The configuration model to render.
     * @returns The rendered configuration as a Markdown string.
     */
    private renderMarkdown(model: ConfigModel): string {
        const out: string[] = [
            `<!-- generated: ${model.createdAt} -->`,
            `# Configuration`,
            `This file gets auto-generated by the application. Do not edit it manually.`,
        ];
        for (const g of model.groups) {
            out.push(`\n## ${g.name}\n`);
            if (process.env.DOC_GENERATE) {
                out.push(`| Key | Notes |`);
                out.push(`| --- | ----- |`);
            } else {
                out.push(`| Key | Value | Notes |`);
                out.push(`| --- | ----- | ----- |`);
            }
            for (const i of g.items) {
                const notes = this.itemNotes(i).replace(/\|/g, "\\|");
                const shown = String(i.shown).replace(/\|/g, "\\|");
                if (process.env.DOC_GENERATE) {
                    out.push(`| \`${i.key}\` | ${notes} |`);
                } else {
                    out.push(`| \`${i.key}\` | \`${shown}\` | ${notes} |`);
                }
            }
        }
        return out.join("\n");
    }

    /**
     * Renders the configuration model as JSON.
     * @param model - The configuration model to render.
     * @returns The rendered configuration as a JSON string.
     */
    private renderJson(model: ConfigModel): string {
        return JSON.stringify(model, null, 2);
    }

    /**
     * Renders the configuration model into the specified format.
     * @param model - The configuration model to render.
     * @param format - The format to render the model in.
     * @returns The rendered configuration as a string.
     */
    private render(model: ConfigModel, format: string): string {
        switch (format) {
            case "markdown":
            case "md":
                return this.renderMarkdown(model);
            case "json":
                return this.renderJson(model);
            case "text":
            default:
                return this.renderText(model);
        }
    }

    /**
     * Writes a file safely, creating directories as needed.
     * @param filePath - The path to the file to write.
     * @param content - The content to write to the file.
     */
    private async writeFileSafely(
        filePath: string,
        content: string,
    ): Promise<void> {
        const dir = dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, "utf8");
    }

    /**
     * Lifecycle hook that is called when the module is initialized.
     */
    async onModuleInit(): Promise<void> {
        const model = this.buildModel();
        const format = String(
            this.cfg.get("CONFIG_PRINT_FORMAT") || "text",
        ).toLowerCase();
        const out = this.render(model, format);
        if (process.env.DOC_GENERATE) {
            const out = this.render(model, "markdown");
            const file = this.cfg.get("CONFIG_PRINT_FILE");
            await this.writeFileSafely(String(file), out);
            Logger.log(`Wrote config to ${file}`, "Config");
        } else if (this.cfg.get<boolean>("CONFIG_PRINT")) {
            Logger.log(out, "Config");
        }
    }
}
