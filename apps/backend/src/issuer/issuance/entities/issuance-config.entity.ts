import { ApiHideProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import type { AuthenticationConfig } from "../dto/authentication-config.dto";
import { CredentialIssuanceBinding } from "./credential-issuance-binding.entity";

/**
 * Entity to manage issuance configs
 */
@Entity()
export class IssuanceConfig {
    /**
     * Unique identifier for the issuance configuration.
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Tenant ID for the issuance configuration.
     */
    @ApiHideProperty()
    @Column("varchar")
    tenantId: string;

    /**
     * Links to all credential config bindings that are included in this issuance config.
     */
    @OneToMany(
        () => CredentialIssuanceBinding,
        (binding) => binding.issuanceConfig,
    )
    credentialIssuanceBindings: CredentialIssuanceBinding[];

    /**
     * Authentication configuration for the issuance process.
     * This determines which OpenID4VC flow to use:
     * - 'none': Pre-authorized code flow (no user authentication required)
     * - 'auth': OID4VCI authorized code flow (user will be redirected for authentication)
     * - 'presentationDuringIssuance': OID4VP request is sent (credential presentation required)
     */
    @IsObject()
    @Column("json")
    authenticationConfig: AuthenticationConfig;

    /**
     * The timestamp when the issuance configuration was created.
     */
    @Column({ type: "date", default: () => "CURRENT_TIMESTAMP" })
    createdAt?: Date;

    /**
     * Webhook to send the result of the notification response
     */
    @Column("json", { nullable: true })
    notifyWebhook?: WebhookConfig;

    /**
     * Value to determine the amount of credentials that are issued in a batch.
     * Default is 1.
     */
    @Column("int", { default: 1 })
    batch_size?: number;
}
