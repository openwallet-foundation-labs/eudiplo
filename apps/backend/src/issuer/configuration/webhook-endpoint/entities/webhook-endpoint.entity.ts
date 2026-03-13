import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";
import {
    AuthConfig,
    WebHookAuthConfig,
    WebHookAuthConfigHeader,
    WebHookAuthConfigNone,
} from "../../../../shared/utils/webhook/webhook.dto";

/**
 * A Webhook Endpoint is a reusable notification target that receives
 * fire-and-forget event callbacks (e.g. credential_accepted / credential_failed).
 *
 * Webhook Endpoints are configured once per tenant and can be
 * referenced by credential configurations via `webhookEndpointId` or
 * per-offer via `webhookEndpointId` on the offer request.
 */
@Entity()
export class WebhookEndpointEntity {
    @IsString()
    @PrimaryColumn("varchar")
    id!: string;

    @Column("varchar", { primary: true })
    tenantId!: string;

    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @IsString()
    @Column("varchar")
    name!: string;

    @IsOptional()
    @IsString()
    @Column("varchar", { nullable: true })
    description?: string | null;

    @IsString()
    @Column("varchar")
    url!: string;

    @ValidateNested()
    @ApiProperty({
        oneOf: [
            { $ref: getSchemaPath(WebHookAuthConfigNone) },
            { $ref: getSchemaPath(WebHookAuthConfigHeader) },
        ],
    })
    @Type(() => WebHookAuthConfig, {
        discriminator: {
            property: "type",
            subTypes: [
                { name: AuthConfig.NONE, value: WebHookAuthConfigNone },
                { name: AuthConfig.API_KEY, value: WebHookAuthConfigHeader },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    @Column("json")
    auth!: WebHookAuthConfigNone | WebHookAuthConfigHeader;
}
