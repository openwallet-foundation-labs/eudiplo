import { ApiProperty } from "@nestjs/swagger";
import {
    CredentialOfferObject,
    NotificationEvent,
} from "@openid4vc/openid4vci";
import { VerificationResult } from "@sd-jwt/sd-jwt-vc";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { AuthorizeQueries } from "../../issuer/authorize/dto/authorize-request.dto";
import { OfferRequestDto } from "../../issuer/oid4vci/dto/offer-request.dto";
import { WebhookConfig } from "../../utils/webhook/webhook.dto";

export enum SessionStatus {
    Active = "active",
    Fetched = "fetched",
    Completed = "completed",
    Expired = "expired",
    Failed = "failed",
}

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
    @PrimaryColumn("uuid")
    id!: string;

    /**
     * The timestamp when the request was created.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * The timestamp when the request was last updated.
     */
    @UpdateDateColumn()
    updatedAt!: Date;

    /**
     * The timestamp when the request is set to expire.
     */
    @Column("date", { nullable: true })
    expiresAt?: Date;

    /**
     * Flag indicating whether to use the DC API for the presentation request.
     */
    @Column("boolean", { nullable: true })
    useDcApi!: boolean;

    /**
     * Tenant ID for multi-tenancy support.
     */
    @Column("varchar")
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, {
        cascade: true,
        onDelete: "CASCADE",
        eager: true,
    })
    tenant!: TenantEntity;

    /**
     * Status of the session.
     */
    @ApiProperty({ enum: SessionStatus })
    @Column("varchar", { nullable: true, default: "active" })
    status!: SessionStatus;

    // issuance specific fields
    /**
     * Authorization code for the session.
     */
    @Column("varchar", { nullable: true })
    authorization_code?: string;
    /**
     * Request URI from the authorization request.
     */
    @Column("varchar", { nullable: true })
    request_uri?: string;
    /**
     * Authorization queries associated with the session.
     */
    @Column("json", { nullable: true })
    auth_queries?: AuthorizeQueries;

    /**
     * Nonce used for the OID4VCI flow.
     */
    @Column("varchar", { nullable: true })
    nonce?: string;

    /**
     * Credential offer object containing details about the credential offer or presentation request.
     */
    @Column("json", { nullable: true })
    offer?: CredentialOfferObject;

    /**
     * Offer URL for the credential offer.
     */
    @Column("varchar", { nullable: true })
    offerUrl?: string;

    /**
     * Credential payload containing the offer request details.
     */
    @Column("json", { nullable: true })
    credentialPayload?: OfferRequestDto;
    /**
     * Webhook configuration to send result and may receive further information.
     */
    @Column("json", { nullable: true })
    claimsWebhook?: WebhookConfig;
    /**
     * Webhook configuration to send the result of the notification response.
     */
    @Column("json", { nullable: true })
    notifyWebhook?: WebhookConfig;
    /**
     * Notifications associated with the session.
     */
    @Column("json", { default: JSON.stringify([]) })
    notifications!: Notification[];

    // presentation specific fields

    /**
     * The ID of the presentation configuration associated with the session.
     */
    @Column("varchar", { nullable: true })
    requestId?: string;

    /**
     * The URL of the presentation auth request.
     */
    @Column("varchar", { nullable: true })
    requestUrl?: string;

    /**
     * Signed presentation auth request.
     */
    @Column("varchar", { nullable: true })
    requestObject?: string;

    /**
     * Verified credentials from the presentation process.
     */
    @Column("json", { nullable: true })
    credentials?: VerificationResult[];

    /**
     * Noncce from the Verifiable Presentation request.
     */
    @Column("varchar", { nullable: true })
    vp_nonce?: string;

    /**
     * Redirect URI to which the user-agent should be redirected after the presentation is completed.
     */
    @Column("varchar", { nullable: true })
    redirectUri?: string;
}
