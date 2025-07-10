import { CredentialOfferObject } from '@openid4vc/openid4vci';
import { VerificationResult } from '@sd-jwt/sd-jwt-vc';
import { AuthorizeQueries } from '../../issuer/authorize/dto/authorize-request.dto';
import { OfferRequest } from '../../issuer/oid4vci/dto/offer-request.dto';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { WebhookConfig } from 'src/utils/webhook.dto';

@Entity()
export class Session {
    @PrimaryColumn('uuid')
    id: string;
    @Column('json', { nullable: true })
    credentials?: VerificationResult[];
    @Column({ nullable: true })
    authorization_code?: string;
    @Column({ nullable: true })
    request_uri?: string;
    @Column('json', { nullable: true })
    auth_queries?: AuthorizeQueries;
    @Column({ nullable: true })
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
}
