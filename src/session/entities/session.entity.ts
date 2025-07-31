import {
    CredentialOfferObject,
    NotificationEvent,
} from '@openid4vc/openid4vci';
import { VerificationResult } from '@sd-jwt/sd-jwt-vc';
import { AuthorizeQueries } from '../../issuer/authorize/dto/authorize-request.dto';
import { OfferRequestDto } from '../../issuer/oid4vci/dto/offer-request.dto';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { WebhookConfig } from '../../utils/webhook/webhook.dto';

/**
 * Represents a session entity for managing user sessions in the application.
 */
export type Notification = {
    /**
     * Unique identifier for the notification.
     */
    id: string;
    /**
     * The type of notification.
     */
    event?: NotificationEvent;

    /**
     * The credential ID associated with the notification.
     */
    credentialConfigurationId: string;
};

/**
 * Entity representing a user session in the application.
 * It includes various properties such as credentials, authorization code,
 * request URI, authorization queries, and more.
 */
@Entity()
export class Session {
    /**
     * Unique identifier for the session.
     */
    @PrimaryColumn('uuid')
    id: string;

    @Column('varchar', { nullable: true })
    issuanceId?: string;

    /**
     * The request ID associated with the session for a presentation flow.
     */
    @Column('varchar', { nullable: true })
    requestId?: string;

    /**
     * Verified credentials from the verification process.
     */
    @Column('json', { nullable: true })
    credentials?: VerificationResult[];
    /**
     * Authorization code for the session.
     */
    @Column('varchar', { nullable: true })
    authorization_code?: string;
    /**
     * Request URI from the authorization request.
     */
    @Column('varchar', { nullable: true })
    request_uri?: string;
    /**
     * Authorization queries associated with the session.
     */
    @Column('json', { nullable: true })
    auth_queries?: AuthorizeQueries;
    /**
     * Noncce from the Verifiable Presentation request.
     */
    @Column('varchar', { nullable: true })
    vp_nonce?: string;
    /**
     * Credential offer object containing details about the credential offer or presentation request.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
    /**
     * Credential offer object containing details about the credential offer or presentation request.
     */
    @Column('json', { nullable: true })
    offer?: CredentialOfferObject;
    /**
     * Credential payload containing the offer request details.
     */
    @Column('json', { nullable: true })
    credentialPayload?: OfferRequestDto;
    /**
     * Webhook configuration to send result and may receive further information.
     */
    @Column('json', { nullable: true })
    webhook?: WebhookConfig;
    /**
     * Webhook configuration to send the result of the notification response.
     */
    @Column('json', { nullable: true })
    notifyWebhook?: WebhookConfig;
    /**
     * Notifications associated with the session.
     */
    @Column('json', { default: JSON.stringify([]) })
    notifications: Notification[];
    /**
     * Tenant ID for multi-tenancy support.
     */
    @Column('varchar')
    tenantId: string;
}
