import {
    CredentialOfferObject,
    NotificationEvent,
} from '@openid4vc/openid4vci';
import { VerificationResult } from '@sd-jwt/sd-jwt-vc';
import { AuthorizeQueries } from '../../issuer/authorize/dto/authorize-request.dto';
import { OfferRequest } from '../../issuer/oid4vci/dto/offer-request.dto';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { WebhookConfig } from '../../utils/webhook.dto';

type Notification = {
    id: string; // Unique identifier for the notification
    event?: NotificationEvent; // Type of event that triggered the notification
};

@Entity()
export class Session {
    @PrimaryColumn('uuid')
    id: string;
    @Column('json', { nullable: true })
    credentials?: VerificationResult[];
    @Column('varchar', { nullable: true })
    authorization_code?: string;
    @Column('varchar', { nullable: true })
    request_uri?: string;
    @Column('json', { nullable: true })
    auth_queries?: AuthorizeQueries;
    @Column('varchar', { nullable: true })
    vp_nonce?: string;
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
    @Column('json', { nullable: true })
    offer?: CredentialOfferObject;
    @Column('json', { nullable: true })
    credentialPayload?: OfferRequest;
    // URL to send the response to, if provided
    @Column('json', { nullable: true })
    webhook?: WebhookConfig;
    @Column('json', { default: JSON.stringify([]) })
    notifications: Notification[];
    @Column('varchar')
    tenantId: string; // Tenant ID for multi-tenancy support
}
