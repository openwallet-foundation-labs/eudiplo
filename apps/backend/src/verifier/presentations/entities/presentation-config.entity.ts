import { ApiHideProperty } from "@nestjs/swagger";
import {
    IsEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from "class-validator";
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { RegistrationCertificateRequest } from "../dto/vp-request.dto";

/**
 * Entity representing a configuration for a Verifiable Presentation (VP) request.
 */
@Entity()
export class PresentationConfig {
    /**
     * Unique identifier for the VP request.
     */
    @Column("varchar", { primary: true })
    @IsString()
    id: string;

    /**
     * The tenant ID for which the VP request is made.
     */
    @ApiHideProperty()
    @Column("varchar", { primary: true })
    @IsEmpty()
    tenantId: string;

    /**
     * Description of the presentation configuration.
     */
    @Column("varchar", { nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    /**
     * Lifetime how long the presentation request is valid after creation, in seconds.
     */
    @IsNumber()
    @IsOptional()
    @Column("int", { default: 300 })
    lifeTime: number;

    /**
     * The DCQL query to be used for the VP request.
     */
    @Column("json")
    @IsObject()
    //TODO: define the structure of the DCQL query
    dcql_query: any;
    /**
     * The registration certificate request containing the necessary details.
     */
    @IsOptional()
    @IsObject()
    @Column("json", { nullable: true })
    registrationCert?: RegistrationCertificateRequest;
    /**
     * Optional webhook URL to receive the response.
     */
    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    webhook?: WebhookConfig;

    /**
     * The timestamp when the VP request was created.
     */
    @IsEmpty()
    @CreateDateColumn()
    createdAt: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @IsEmpty()
    @UpdateDateColumn()
    updatedAt: Date;
}
