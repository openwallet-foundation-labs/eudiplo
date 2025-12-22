import { Module } from "@nestjs/common";
import { StatusListModule } from "./status/status-list.module";

/**
 * Lifecycle Module - Manages credential lifecycle operations
 *
 * Responsibilities:
 * - Credential status management
 * - Status list creation and updates
 * - Revocation and suspension handling
 */
@Module({
    imports: [StatusListModule],
    exports: [StatusListModule],
})
export class LifecycleModule {}
