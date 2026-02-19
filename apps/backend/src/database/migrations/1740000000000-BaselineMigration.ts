import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline Migration - v2.0.0
 *
 * This migration marks the starting point for TypeORM migrations.
 * It does NOT create tables - instead it relies on either:
 *
 * 1. **Existing installations**: Schema already exists from previous
 *    `synchronize: true` mode. This migration just records itself
 *    in the migration history.
 *
 * 2. **New installations**: Users should set `DB_SYNCHRONIZE=true`
 *    for the initial run to create the schema, then disable it.
 *
 * Future schema changes will be handled by generated migrations.
 */
export class BaselineMigration1740000000000 implements MigrationInterface {
    name = "BaselineMigration1740000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if schema already exists (existing installation)
        const tables = await queryRunner.getTables(["tenant_entity"]);

        if (tables.length > 0) {
            console.log(
                "[Migration] Existing database detected. Marking baseline as complete.",
            );
            return;
        }

        // New installation without schema
        console.log(
            "[Migration] Fresh database detected. Schema will be created by TypeORM synchronize.",
        );
        console.log(
            "[Migration] Ensure DB_SYNCHRONIZE=true is set for initial setup.",
        );
    }

    public async down(): Promise<void> {
        // This is a baseline marker - nothing to revert
        console.log("[Migration] Baseline migration has nothing to revert.");
    }
}
