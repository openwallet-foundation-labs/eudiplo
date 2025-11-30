import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClassConstructor, plainToClass } from "class-transformer";
import { ValidationError, validate } from "class-validator";
import { existsSync, readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { ImportOptions } from "./import-options";

@Injectable()
export class ConfigImportService {
    constructor(
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {}

    /**
     * Generic import method that handles the common pattern across all services
     */
    async importConfigs<T extends object>(
        options: ImportOptions<T>,
    ): Promise<void> {
        if (!this.configService.get<boolean>("CONFIG_IMPORT")) {
            return;
        }

        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");

        const tenantFolders = readdirSync(configPath, {
            withFileTypes: true,
        }).filter((tenant) => tenant.isDirectory());

        const strictConfig = this.configService.get<any>("CONFIG_STRICT");

        for (const tenant of tenantFolders) {
            let counter = 0;
            const path = join(configPath, tenant.name, options.subfolder);

            if (!existsSync(path)) {
                continue;
            }

            const files = readdirSync(path);

            for (const file of files) {
                // Filter by extension if provided
                if (
                    options.fileExtension &&
                    !file.endsWith(options.fileExtension)
                ) {
                    continue;
                }

                try {
                    const filePath = join(path, file);

                    // Load data using custom loader or default JSON loader
                    let data: T;
                    if (options.loadData) {
                        data = await Promise.resolve(
                            options.loadData(filePath),
                        );
                    } else {
                        const payload = JSON.parse(
                            readFileSync(filePath, "utf8"),
                        );
                        data = payload as T;
                    }

                    // Replace placeholders like ${ENV_VAR} or ${ENV_VAR:default}
                    data = this.replacePlaceholders(data);

                    // Validate if validation class is provided
                    if (options.validationClass) {
                        const validationResult = await this.validateConfig(
                            file,
                            data,
                            options.validationClass,
                            tenant,
                            options.resourceType,
                            options.formatValidationError,
                        );

                        if (!validationResult.isValid) {
                            continue; // Skip invalid config
                        }

                        data = validationResult.data;
                    }

                    // Check if exists
                    const exists = await options
                        .checkExists(tenant.name, data, file)
                        .catch(() => false);

                    if (exists && !force) {
                        this.logger.info(
                            { event: "Import" },
                            `${options.resourceType} ${file} already exists for ${tenant.name}, skipping`,
                        );
                        continue;
                    }

                    // Delete existing if force is enabled
                    if (exists && force && options.deleteExisting) {
                        await options.deleteExisting(tenant.name, data, file);
                    }

                    // Process and store item
                    await options.processItem(tenant.name, data, file);
                    counter++;
                } catch (error: any) {
                    this.logger.error(
                        {
                            event: "ImportError",
                            file,
                            tenant: tenant.name,
                            error: error.message,
                        },
                        `Failed to import ${options.resourceType} ${file} in tenant ${tenant.name}`,
                    );
                    if (strictConfig === "abort") {
                        // Abort the entire import process in strict abort mode
                        throw error;
                    }
                }
            }

            if (counter > 0) {
                this.logger.info(
                    { event: "Import" },
                    `${counter} ${options.resourceType}(s) imported for ${tenant.name}`,
                );
            }
        }
    }

    /**
     * Recursively replace placeholders of the form ${VAR} or ${VAR:default} in all string properties.
     * ${VAR} -> replaced with process.env.VAR if defined; if undefined and no default given, logs a warning and leaves placeholder intact.
     * ${VAR:default} -> replaced with env value if defined, otherwise with "default".
     */
    private replacePlaceholders<T>(input: T): T {
        const seen = new WeakSet();
        const isObject = (val: any) =>
            val && typeof val === "object" && !Array.isArray(val);
        const strictConfigInner = this.configService.get<any>("CONFIG_STRICT");
        const strictMode =
            strictConfigInner === true
                ? "skip"
                : strictConfigInner === false || strictConfigInner === undefined
                  ? "ignore"
                  : (strictConfigInner as string);

        const processString = (str: string): string => {
            const pattern = /\$\{([A-Z0-9_]+)(?::([^}]*))?\}/g;
            return str.replace(
                pattern,
                (fullMatch, varName: string, defVal: string) => {
                    const envVal = process.env[varName];
                    if (envVal !== undefined && envVal !== "") {
                        return envVal;
                    }
                    if (defVal !== undefined) {
                        return defVal;
                    }
                    if (
                        strictMode === "abort" ||
                        strictMode === "skip" ||
                        strictMode === "true"
                    ) {
                        // abort -> will bubble up and stop the whole process via outer catch
                        // skip/true -> outer catch will log and continue with next file
                        throw new Error(
                            `Missing required environment variable ${varName} for placeholder ${fullMatch}`,
                        );
                    }
                    // ignore/false/undefined: keep placeholder and warn
                    this.logger.warn(
                        { event: "ImportPlaceholder", var: varName },
                        `Environment variable ${varName} not set and no default provided (placeholder kept)`,
                    );
                    return fullMatch; // keep original placeholder
                },
            );
        };

        const recurse = (val: any): any => {
            if (typeof val === "string") return processString(val);
            if (Array.isArray(val)) return val.map(recurse);
            if (Buffer.isBuffer(val)) return val; // skip binary
            if (isObject(val)) {
                if (seen.has(val)) return val; // avoid circular refs
                seen.add(val);
                for (const key of Object.keys(val)) {
                    (val as any)[key] = recurse((val as any)[key]);
                }
                return val;
            }
            return val;
        };

        return recurse(input);
    }

    /**
     * Validate configuration against a class
     */
    async validateConfig<T extends object>(
        file: string,
        payload: any,
        cls: ClassConstructor<T>,
        tenant: { name: string },
        resourceType: string,
        formatError?: (error: ValidationError) => any,
    ): Promise<{ isValid: boolean; data: T }> {
        const config = plainToClass(cls, payload);

        const validationErrors = await validate(config as object, {
            whitelist: true,
            forbidUnknownValues: false,
            forbidNonWhitelisted: false,
            stopAtFirstError: false,
        });

        if (validationErrors.length > 0) {
            const formatter =
                formatError ||
                ((error: ValidationError) => ({
                    property: error.property,
                    constraints: error.constraints,
                    value: error.value,
                }));

            this.logger.error(
                {
                    event: "ValidationError",
                    file,
                    tenant: tenant.name,
                    errors: validationErrors.map(formatter),
                },
                `Validation failed for ${resourceType} ${file} in tenant ${tenant.name}`,
            );

            return { isValid: false, data: config };
        }

        return { isValid: true, data: config };
    }

    /**
     * Extract nested error messages from validation errors
     */
    extractErrorMessages(error: ValidationError): string[] {
        const messages: string[] = [];

        if (error.constraints) {
            messages.push(
                ...Object.values(error.constraints as Record<string, string>),
            );
        }

        if (error.children && error.children.length > 0) {
            for (const child of error.children) {
                messages.push(...this.extractErrorMessages(child));
            }
        }

        return messages;
    }

    /**
     * Format validation errors with nested messages
     */
    formatNestedValidationError(error: ValidationError): string {
        const messages = this.extractErrorMessages(error);
        return messages.length > 0
            ? `${error.property}: ${messages.join(", ")}`
            : error.property;
    }
}
