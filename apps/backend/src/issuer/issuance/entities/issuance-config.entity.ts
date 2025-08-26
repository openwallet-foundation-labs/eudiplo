import {
    ApiExtraModels,
    ApiHideProperty,
    ApiProperty,
    getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/entitites/tenant.entity";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { CredentialConfig } from "../../credentials/entities/credential.entity";
import {
    AuthenticationMethod,
    AuthenticationMethodAuth,
    AuthenticationMethodNone,
    AuthenticationMethodPresentation,
} from "../dto/authentication-config.dto";

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
     * Unique identifier for the issuance configuration.
     */
    @IsString()
    @Column("varchar", { primary: true })
    id: string;

    /**
     * Tenant ID for the issuance configuration.
     */
    @ApiHideProperty()
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant: TenantEntity;

    /**
     * Description of the issuance configuration.
     */
    @IsString()
    @IsOptional()
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * Links to all credential config bindings that are included in this issuance config.
     */
    @ManyToMany(
        () => CredentialConfig,
        (credential) => credential.issuanceConfigs,
    )
    @JoinTable()
    credentialConfigs: CredentialConfig[];

    /**
     * Authentication configuration for the issuance process.
     */
    @Column("json")
    @ValidateNested()
    @ApiProperty({
        oneOf: [
            { $ref: getSchemaPath(AuthenticationMethodNone) },
            { $ref: getSchemaPath(AuthenticationMethodAuth) },
            { $ref: getSchemaPath(AuthenticationMethodPresentation) },
        ],
    })
    @Type(() => AuthenticationMethodNone, {
        discriminator: {
            property: "method",
            subTypes: [
                {
                    name: AuthenticationMethod.NONE,
                    value: AuthenticationMethodNone,
                },
                {
                    name: AuthenticationMethod.AUTH,
                    value: AuthenticationMethodAuth,
                },
                {
                    name: AuthenticationMethod.PRESENTATION_DURING_ISSUANCE,
                    value: AuthenticationMethodPresentation,
                },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    authenticationConfig:
        | AuthenticationMethodNone
        | AuthenticationMethodAuth
        | AuthenticationMethodPresentation;

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * Webhook to receive claims for the issuance process.
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    @Column("json", { nullable: true })
    claimsWebhook?: WebhookConfig;

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
    batch_size?: number;
}
