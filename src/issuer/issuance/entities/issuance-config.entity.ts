import { IsObject } from 'class-validator';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { CredentialConfig } from '../../credentials/entities/credential.entity';
import type { AuthenticationConfig } from '../dto/authentication-config.dto';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';

/**
 * Entity to manage issuance configs
 */
@Entity()
export class IssuanceConfig {
    /**
     * Unique identifier for the issuance configuration.
     */
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Tenant ID for the issuance configuration.
     */
    @ApiHideProperty()
    @Column('varchar')
    tenantId: string;

    /**
     * Links to all credential configs that are included in this issuance config.
     */
    @ManyToMany(
        () => CredentialConfig,
        (credentialConfig) => credentialConfig.issuanceConfig,
    )
    credentialConfigs: CredentialConfig[];

    /**
     * Authentication configuration for the issuance process.
     * This determines which OpenID4VC flow to use:
     * - 'none': Pre-authorized code flow (no user authentication required)
     * - 'auth': OID4VCI authorized code flow (user will be redirected for authentication)
     * - 'presentationDuringIssuance': OID4VP request is sent (credential presentation required)
     */
    @IsObject()
    @Column('json')
    authenticationConfig: AuthenticationConfig;

    /**
     * The timestamp when the issuance configuration was created.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt?: Date;

    /**
     * Webhook to send the result of the notification response
     */
    @Column('json', { nullable: true })
    notifyWebhook: WebhookConfig;
}
