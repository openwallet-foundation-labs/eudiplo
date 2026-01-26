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

    /**
     * Indicates whether wallet attestation is required for the token endpoint.
     * When enabled, wallets must provide OAuth-Client-Attestation headers.
     * Default value is false.
     */
    @IsBoolean()
    @IsOptional()
    @Column("boolean", { default: false })
    walletAttestationRequired?: boolean;

    /**
     * URLs of trust lists containing trusted wallet providers.
     * The wallet attestation's X.509 certificate will be validated against these trust lists.
     * If empty and walletAttestationRequired is true, all wallet providers are rejected.
     */
    @IsArray()
    @IsOptional()
    @Column({ type: "json", nullable: true })
    walletProviderTrustLists?: string[];

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
