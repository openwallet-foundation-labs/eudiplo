import {
    MigrationInterface,
    QueryRunner,
    TableColumn,
    TableForeignKey,
} from "typeorm";

/**
 * Add key rotation fields to key_entity and issuerKeyId to cert_entity.
 *
 * This migration adds:
 * - signingCaKeyId: FK to the CA key used to sign certificates for this key
 * - rotationEnabled: Whether automatic key rotation is enabled
 * - rotationIntervalDays: Rotation interval in days
 * - certValidityDays: Certificate validity in days
 * - lastRotatedAt: Timestamp of last rotation
 * - issuerKeyId: FK on cert_entity to track which CA key signed the cert
 */
export class AddKeyRotation1744000000000 implements MigrationInterface {
    name = "AddKeyRotation1744000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- key_entity columns ---
        const keyTable = await queryRunner.getTable("key_entity");
        if (!keyTable) {
            console.log(
                "[Migration] key_entity table not found — skipping (schema may not exist yet).",
            );
            return;
        }

        // Add signingCaKeyId column
        if (!keyTable.columns.some((col) => col.name === "signingCaKeyId")) {
            await queryRunner.addColumn(
                "key_entity",
                new TableColumn({
                    name: "signingCaKeyId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added signingCaKeyId column to key_entity.",
            );
        }

        // Add rotationEnabled column
        if (!keyTable.columns.some((col) => col.name === "rotationEnabled")) {
            await queryRunner.addColumn(
                "key_entity",
                new TableColumn({
                    name: "rotationEnabled",
                    type: "boolean",
                    default: false,
                }),
            );
            console.log(
                "[Migration] Added rotationEnabled column to key_entity.",
            );
        }

        // Add rotationIntervalDays column
        if (
            !keyTable.columns.some((col) => col.name === "rotationIntervalDays")
        ) {
            await queryRunner.addColumn(
                "key_entity",
                new TableColumn({
                    name: "rotationIntervalDays",
                    type: "int",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added rotationIntervalDays column to key_entity.",
            );
        }

        // Add certValidityDays column
        if (!keyTable.columns.some((col) => col.name === "certValidityDays")) {
            await queryRunner.addColumn(
                "key_entity",
                new TableColumn({
                    name: "certValidityDays",
                    type: "int",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added certValidityDays column to key_entity.",
            );
        }

        // Add lastRotatedAt column
        if (!keyTable.columns.some((col) => col.name === "lastRotatedAt")) {
            await queryRunner.addColumn(
                "key_entity",
                new TableColumn({
                    name: "lastRotatedAt",
                    type: "datetime",
                    isNullable: true,
                }),
            );
            console.log(
                "[Migration] Added lastRotatedAt column to key_entity.",
            );
        }

        // Add FK for signingCaKeyId (self-referencing)
        const keyFkExists = keyTable.foreignKeys.some(
            (fk) =>
                fk.columnNames.includes("signingCaKeyId") &&
                fk.columnNames.includes("tenantId"),
        );
        if (!keyFkExists) {
            await queryRunner.createForeignKey(
                "key_entity",
                new TableForeignKey({
                    columnNames: ["signingCaKeyId", "tenantId"],
                    referencedTableName: "key_entity",
                    referencedColumnNames: ["id", "tenantId"],
                    onDelete: "SET NULL",
                }),
            );
            console.log(
                "[Migration] Added FK for signingCaKeyId on key_entity.",
            );
        }

        // --- cert_entity columns ---
        const certTable = await queryRunner.getTable("cert_entity");
        if (!certTable) {
            console.log(
                "[Migration] cert_entity table not found — skipping cert columns.",
            );
            return;
        }

        // Add issuerKeyId column
        if (!certTable.columns.some((col) => col.name === "issuerKeyId")) {
            await queryRunner.addColumn(
                "cert_entity",
                new TableColumn({
                    name: "issuerKeyId",
                    type: "varchar",
                    isNullable: true,
                }),
            );
            console.log("[Migration] Added issuerKeyId column to cert_entity.");
        }

        // Add FK for issuerKeyId
        const certFkExists = certTable.foreignKeys.some(
            (fk) =>
                fk.columnNames.includes("issuerKeyId") &&
                fk.columnNames.includes("tenantId"),
        );
        if (!certFkExists) {
            await queryRunner.createForeignKey(
                "cert_entity",
                new TableForeignKey({
                    columnNames: ["issuerKeyId", "tenantId"],
                    referencedTableName: "key_entity",
                    referencedColumnNames: ["id", "tenantId"],
                    onDelete: "SET NULL",
                }),
            );
            console.log("[Migration] Added FK for issuerKeyId on cert_entity.");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // --- cert_entity ---
        const certTable = await queryRunner.getTable("cert_entity");
        if (certTable) {
            const certFk = certTable.foreignKeys.find(
                (fk) =>
                    fk.columnNames.includes("issuerKeyId") &&
                    fk.columnNames.includes("tenantId"),
            );
            if (certFk) {
                await queryRunner.dropForeignKey("cert_entity", certFk);
            }
            if (certTable.columns.some((col) => col.name === "issuerKeyId")) {
                await queryRunner.dropColumn("cert_entity", "issuerKeyId");
            }
        }

        // --- key_entity ---
        const keyTable = await queryRunner.getTable("key_entity");
        if (keyTable) {
            const keyFk = keyTable.foreignKeys.find(
                (fk) =>
                    fk.columnNames.includes("signingCaKeyId") &&
                    fk.columnNames.includes("tenantId"),
            );
            if (keyFk) {
                await queryRunner.dropForeignKey("key_entity", keyFk);
            }

            const columnsToRemove = [
                "signingCaKeyId",
                "rotationEnabled",
                "rotationIntervalDays",
                "certValidityDays",
                "lastRotatedAt",
            ];
            for (const colName of columnsToRemove) {
                if (keyTable.columns.some((col) => col.name === colName)) {
                    await queryRunner.dropColumn("key_entity", colName);
                    console.log(
                        `[Migration] Dropped ${colName} column from key_entity.`,
                    );
                }
            }
        }
    }
}
