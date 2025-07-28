import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { IsObject, IsOptional } from 'class-validator';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { VCT } from '../../credentials-metadata/dto/credential-config.dto';
import { SchemaResponse } from '../../credentials-metadata/dto/schema-response.dto';
import { IssuanceConfig } from '../../issuance/entities/issuance-config.entity';

/**
 * Entity to manage a credential configuration
 */
@Entity()
export class CredentialConfig {
    /**
     * Unique identifier for the configuration to reference it.
     */
    @Column('varchar', { primary: true })
    id: string;
    /**
     * Tenant ID for the issuance configuration.
     */
    @Column('varchar', { primary: true })
    tenantId: string;
    /**
     * OID4VCI issuer metadata crddential configuration element.
     */
    @Column('json')
    @IsObject()
    config: CredentialConfigurationSupported;
    /**
     * Claims that should be set by default when this credential is being issued. Will be overwritten when passed during a credential offer request.
     */
    @Column('json', { nullable: true })
    @IsObject()
    claims: Record<string, any>;
    /**
     * Disclosure frame for the sd jwt vc.
     */
    @Column('json', { nullable: true })
    @IsObject()
    disclosureFrame: Record<string, any>;
    @Column('json', { nullable: true })
    /**
     * VCT values that are hosted by this service.
     */
    @IsObject()
    @IsOptional()
    vct?: VCT;
    @Column('json', { nullable: true })
    /**
     * json schema that is used during issuance for the validation of the claims.
     */
    @IsObject()
    @IsOptional()
    schema?: SchemaResponse;
    /**
     * Link to all the issuance configs that are using this credential.
     */
    @ManyToMany(
        () => IssuanceConfig,
        (issuanceConfig) => issuanceConfig.credentialConfigs,
        { cascade: true },
    )
    @JoinTable()
    issuanceConfig: IssuanceConfig[];
}
