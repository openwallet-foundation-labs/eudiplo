import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import { VALIDATION_SCHEMA } from "./combined.schema";
import {
    extractConditionsFromKeyDesc,
    flattenMetas,
    isEffectivelyRequired,
} from "./helpers";

/** ----- Types for the structured model ----- */
type Presence = "required" | "optional" | "";

export interface ConfigItem {
    key: string;
    value: unknown; // effective value from ConfigService
    shown: string; // masked/pretty value for display
    group: string; // from meta.group (defaults to "Other")
    order: number; // from meta.order (defaults to 999)
    description: string; // from Joi description/notes
    presence: Presence; // required/optional/""
    usedDefault: boolean; // true if schema default applied (env not set)
    secret: boolean; // from meta.secret (mask)
    conditions: string[]; // human-readable when/then/otherwise
    meta: Record<string, any>; // flattened metas for extensibility
}

export interface ConfigGroup {
    name: string;
    order: number; // min(item.order) within the group
    items: ConfigItem[]; // sorted by order then key
}

export interface ConfigModel {
    createdAt: string; // ISO timestamp
    groups: ConfigGroup[]; // grouped + sorted
    all: ConfigItem[]; // flat list (already filtered wrt advanced etc.)
}

@Injectable()
export class ConfigPrinterService implements OnModuleInit {
    constructor(
        private readonly cfg: ConfigService,
        private readonly logger: PinoLogger,
    ) {}

    /** Build a structured, reusable config model (JSON-friendly). */
    public buildModel(): ConfigModel {
        const described = VALIDATION_SCHEMA.describe() as any;
        const descKeys: Record<string, any> = described.keys ?? {};
        const allKeys = Object.keys(descKeys);

        const showAdvanced = this.cfg.get("CONFIG_PRINT_ADVANCED") === "true";
        const items: ConfigItem[] = [];

        // snapshot current *raw* env seen by validation
        const rawEnv: Record<string, any> = { ...process.env };

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
            const shown =
                value === undefined
                    ? "(unset)"
                    : secret
                      ? "***"
                      : typeof value === "string"
                        ? value
                        : JSON.stringify(value);

            const usedDefault =
                !(key in rawEnv) && Object.hasOwn.call(flags, "default");

            const conditions = extractConditionsFromKeyDesc(keyDesc);

            const effectiveRequired = isEffectivelyRequired(key, rawEnv);

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
                // you can store it directly on the item:
                // @ts-ignore – add to your ConfigItem interface if you want it typed
                effectiveRequired,
            } as any);
        }

        // Group & sort
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

    private buildNotes(
        i: ConfigItem & { effectiveRequired?: boolean },
    ): string {
        const presence = i.presence ? ` [${i.presence}]` : "";
        const defTag = i.usedDefault ? " (default)" : "";
        const conds = i.conditions.map((c) => `[${c}]`).join(" ");
        const nowReq = i.effectiveRequired ? " [required now]" : ""; // NEW

        const extra = [
            i.meta?.deprecated ? `(deprecated: ${i.meta.deprecated})` : "",
            i.meta?.restartRequired ? "(restart required)" : "",
            i.meta?.docUrl ? `(docs: ${i.meta.docUrl})` : "",
            i.meta?.example ? `(e.g. ${i.meta.example})` : "",
        ]
            .filter(Boolean)
            .join(" ");

        return [i.description, presence, nowReq, defTag, conds, extra]
            .filter(Boolean)
            .join(" ")
            .trim();
    }

    private renderText(model: ConfigModel): string {
        const sections: string[] = [];
        for (const g of model.groups) {
            sections.push(`\n=== ${g.name} ===`);
            for (const i of g.items) {
                sections.push(
                    `${i.key.padEnd(28)} = ${String(i.shown).padEnd(24)}  # ${this.buildNotes(i)}`,
                );
            }
        }
        return `\n${sections.join("\n")}\n`;
    }

    private renderMarkdown(model: ConfigModel): string {
        const sections: string[] = [];
        for (const g of model.groups) {
            sections.push(`\n### ${g.name}\n`);
            sections.push(`| Key | Value | Notes |`);
            sections.push(`| --- | ----- | ----- |`);
            for (const i of g.items) {
                const notes = this.buildNotes(i).replace(/\|/g, "\\|");
                const shown = String(i.shown).replace(/\|/g, "\\|");
                sections.push(`| \`${i.key}\` | \`${shown}\` | ${notes} |`);
            }
        }
        return sections.join("\n");
    }

    private renderJson(model: ConfigModel): string {
        return JSON.stringify(model, null, 2);
    }

    /** Called when the module is initialized: build -> render -> log */
    onModuleInit(): void {
        if (!this.cfg.get<boolean>("CONFIG_PRINT")) return;

        const model = this.buildModel();
        const fmt = String(this.cfg.get("CONFIG_PRINT_FORMAT"));

        let output: string;
        switch (fmt) {
            case "markdown":
            case "md":
                output = this.renderMarkdown(model);
                break;
            case "json":
                output = this.renderJson(model);
                break;
            case "text":
            default:
                output = this.renderText(model);
                break;
        }

        this.logger.info(
            `Application configuration (format=${fmt}):\n${output}`,
        );
    }
}
