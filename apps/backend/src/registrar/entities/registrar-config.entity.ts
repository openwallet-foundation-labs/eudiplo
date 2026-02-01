import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";

/**
 * Stores the configuration for connecting to an external registrar service.
 * Each tenant can have their own registrar configuration with OIDC credentials.
 *
 * Note: Credentials are stored in plaintext for ease of use without the client.
 * For production environments with higher security requirements, consider
 * using a secrets manager like HashiCorp Vault.
 */
@Entity()
export class RegistrarConfigEntity {
    /**
     * The tenant ID this configuration belongs to.
     */
    @PrimaryColumn("varchar")
    tenantId!: string;

    /**
     * The tenant that owns this configuration.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * The base URL of the registrar API.
     * Example: https://sandbox.eudi-wallet.org/api
     */
    @ApiProperty({
        description: "The base URL of the registrar API",
        example: "https://sandbox.eudi-wallet.org/api",
    })
    @IsUrl()
    @Column("varchar")
    registrarUrl!: string;

    /**
     * The OIDC issuer URL for authentication.
     * This is typically the Keycloak realm URL.
     * Example: https://auth.example.com/realms/my-realm
     */
    @ApiProperty({
        description:
            "The OIDC issuer URL for authentication (e.g., Keycloak realm URL)",
        example: "https://auth.example.com/realms/my-realm",
    })
    @IsUrl()
    @Column("varchar")
    oidcUrl!: string;

    /**
     * The OIDC client ID for the registrar.
     * This is typically provided by the registrar service.
     */
    @ApiProperty({
        description: "The OIDC client ID for the registrar",
        example: "registrar-client",
    })
    @IsString()
    @Column("varchar")
    clientId!: string;

    /**
     * The OIDC client secret (optional, for confidential clients).
     */
    @ApiPropertyOptional({
        description:
            "The OIDC client secret (optional, for confidential clients)",
    })
    @IsOptional()
    @IsString()
    @Column("varchar", { nullable: true })
    clientSecret?: string;

    /**
     * The username for OIDC Resource Owner Password Credentials (ROPC) flow.
     */
    @ApiProperty({
        description: "The username for OIDC login",
        example: "admin@example.com",
    })
    @IsString()
    @Column("varchar")
    username!: string;

    /**
     * The password for OIDC Resource Owner Password Credentials (ROPC) flow.
     * Note: Stored in plaintext for ease of use. Use a secrets manager for production.
     */
    @ApiProperty({
        description: "The password for OIDC login (stored in plaintext)",
    })
    @IsString()
    @Column("varchar")
    password!: string;
}
