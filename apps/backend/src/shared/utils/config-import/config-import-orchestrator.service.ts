import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

/**
 * Interface for services that can be registered with the import orchestrator.
 */
export interface ImportableService {
    /**
     * Import method that will be called by the orchestrator.
     */
    import(): Promise<void>;
}

/**
 * Import phase definitions with their order.
 * Lower numbers run first.
 */
export enum ImportPhase {
    /** Core infrastructure (keys, certificates) */
    CORE = 10,
    /** Configuration (issuance, credential configs) */
    CONFIGURATION = 20,
    /** References (presentation configs that may reference certs) */
    REFERENCES = 30,
    /** Final phase (status lists, trust lists) */
    FINAL = 40,
}

interface RegisteredImporter {
    name: string;
    phase: ImportPhase;
    import: () => Promise<void>;
}

/**
 * Centralized orchestrator for configuration imports.
 * Ensures imports happen in the correct order based on dependencies.
 *
 * Services should register their import functions during construction,
 * then call runImports() from onApplicationBootstrap().
 * Only the first call to runImports() will actually execute imports.
 */
@Injectable()
export class ConfigImportOrchestratorService {
    private readonly importers: RegisteredImporter[] = [];
    private hasRun = false;
    private runPromise: Promise<void> | null = null;

    constructor(private readonly logger: PinoLogger) {}

    /**
     * Register an import function for orchestration.
     * @param name - Human-readable name for logging
     * @param phase - The import phase (determines order)
     * @param importFn - The import function to call
     */
    register(
        name: string,
        phase: ImportPhase,
        importFn: () => Promise<void>,
    ): void {
        if (this.hasRun) {
            this.logger.warn(
                `Importer "${name}" registered after orchestration already ran`,
            );
        }
        this.importers.push({ name, phase, import: importFn });
    }

    /**
     * Execute all registered imports in phase order.
     * Safe to call multiple times - only runs once.
     * Returns the same promise if called while running.
     */
    async runImports(): Promise<void> {
        // If already running, return the existing promise
        if (this.runPromise) {
            return this.runPromise;
        }

        // If already completed, return immediately
        if (this.hasRun) {
            return;
        }

        // Start the import process
        this.runPromise = this.executeImports();
        return this.runPromise;
    }

    private async executeImports(): Promise<void> {
        // Sort by phase
        const sorted = [...this.importers].sort((a, b) => a.phase - b.phase);

        this.logger.info(
            `Starting config import orchestration with ${sorted.length} importers`,
        );

        for (const importer of sorted) {
            this.logger.debug(
                `Running import: ${importer.name} (phase ${importer.phase})`,
            );
            try {
                await importer.import();
            } catch (error) {
                this.logger.error(
                    { error, importer: importer.name },
                    `Failed to import ${importer.name}`,
                );
                throw error;
            }
        }

        this.hasRun = true;
        this.logger.info("Config import orchestration completed");
    }
}
