import { ApiExtraModels, ApiHideProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    ValidateNested,
} from "class-validator";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";
import { WebhookConfig } from "../../../../shared/utils/webhook/webhook.dto";
import {
    AuthenticationMethodAuth,
    AuthenticationMethodNone,
    AuthenticationMethodPresentation,
} from "../dto/authentication-config.dto";
import { DisplayInfo } from "../dto/display.dto";

/**
 * Entity to manage issuance configs
 */
@ApiExtraModels(
    AuthenticationMethodNone,
    AuthenticationMethodAuth,
    AuthenticationMethodPresentation,
)
@Entity()
export class IssuanceConfig {
    /**
     * Tenant ID for the issuance configuration.
     */
    @ApiHideProperty()
    @PrimaryColumn()
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * Authentication server URL for the issuance process.
     */
    @IsArray()
    @IsOptional()
    @Column({ type: "json", nullable: true })
    authServers?: string[];

    /**
     * Webhook to send the result of the notification response
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    @Column("json", { nullable: true })
    notifyWebhook?: WebhookConfig;

    /**
     * Value to determine the amount of credentials that are issued in a batch.
     * Default is 1.
     */
    @IsNumber()
    @IsOptional()
    @Column("int", { default: 1 })
    batchSize?: number;

    /**
     * Indicates whether DPoP is required for the issuance process. Default value is true.
     */
    @IsBoolean()
    @IsOptional()
    @Column("boolean", { default: true })
    dPopRequired?: boolean;

    @ValidateNested({ each: true })
    @Type(() => DisplayInfo)
    @Column("json", { nullable: true })
    display!: DisplayInfo[];

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt!: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt!: Date;
}
