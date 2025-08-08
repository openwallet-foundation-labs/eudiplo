import { IsString, IsObject, IsEmpty, IsOptional } from 'class-validator';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';
import { RegistrationCertificateRequest } from '../dto/vp-request.dto';
import { Column, Entity } from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';

/**
 * Entity representing a configuration for a Verifiable Presentation (VP) request.
 */
@Entity()
export class PresentationConfig {
    /**
     * Unique identifier for the VP request.
     */
    @Column('varchar', { primary: true })
    @IsString()
    id: string;

    /**
     * The tenant ID for which the VP request is made.
     */
    @ApiHideProperty()
    @Column('varchar', { primary: true })
    @IsEmpty()
    tenantId: string;

    /**
     * The DCQL query to be used for the VP request.
     */
    @Column('json')
    @IsObject()
    //TODO: define the structure of the DCQL query
    dcql_query: any;
    /**
     * The registration certificate request containing the necessary details.
     */
    @IsOptional()
    @IsObject()
    @Column('json')
    registrationCert?: RegistrationCertificateRequest;
    /**
     * Optional webhook URL to receive the response.
     */
    @Column('json', { nullable: true })
    @IsObject()
    webhook?: WebhookConfig;

    /**
     * The timestamp when the VP request was created.
     */
    @IsEmpty()
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}
