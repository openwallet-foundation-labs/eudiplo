import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { setGlobalConfig } from "@openid4vc/openid4vci";
import { ConfigurationModule } from "./configuration/configuration.module";
import { IssuanceModule } from "./issuance/issuance.module";
import { LifecycleModule } from "./lifecycle/lifecycle.module";

/**
 * Issuer Module - Root module for credential issuance functionality
 *
 * This module orchestrates three main domains:
 * - Configuration: Issuer and credential configurations
 * - Issuance: Credential issuance operations and protocols
 * - Lifecycle: Credential status and lifecycle management
 */
@Module({
    imports: [ConfigurationModule, IssuanceModule, LifecycleModule],
    exports: [ConfigurationModule, IssuanceModule, LifecycleModule],
})
export class IssuerModule {
    constructor(configService: ConfigService) {
        const unsecure = configService
            .getOrThrow<string>("PUBLIC_URL")
            .startsWith("http://");
        setGlobalConfig({ allowInsecureUrls: unsecure });
    }
}
