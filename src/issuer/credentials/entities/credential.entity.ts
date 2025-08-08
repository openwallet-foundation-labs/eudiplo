import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import {
    IsBoolean,
    IsEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';
import { VCT } from '../../credentials-metadata/dto/credential-config.dto';
import { SchemaResponse } from '../../credentials-metadata/dto/schema-response.dto';
import { CredentialIssuanceBinding } from '../../issuance/entities/credential-issuance-binding.entity';

/**
 * Entity to manage a credential configuration
 */
@Entity()
export class CredentialConfig {
    /**
     * Unique identifier for the configuration to reference it.
     */
    @IsString()
    @Column('varchar', { primary: true })
    id: string;
    /**
     * Tenant ID for the issuance configuration.
     */
    @IsEmpty()
    @Column('varchar', { primary: true })
    tenantId: string;

    //TODO: only allow display config for now
    /**
     * OID4VCI issuer metadata credential configuration element.
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
     * If true, the credential will be key bound.
     */
    @IsBoolean()
    @IsOptional()
    @Column('boolean', { default: false })
    keyBinding?: boolean;

    /**
     * Optional key ID for the credential configuration.
     * This is used to identify the key used for signing the credential.
     */
    @IsString()
    @IsOptional()
    @Column('varchar', { nullable: true })
    keyId?: string;
    /**
     * Optional status management flag for the credential configuration.
     * If true, a status management will be applied to the credential.
     */
    @IsBoolean()
    @IsOptional()
    @Column('boolean', { default: false })
    statusManagement?: boolean;
    /**
     * Optional livetime for the credential configuration in seconds.
     */
    @IsNumber()
    @IsOptional()
    @Column('int', { nullable: true })
    lifeTime?: number;

    /**
     * json schema that is used during issuance for the validation of the claims.
     */
    @IsObject()
    @IsOptional()
    schema?: SchemaResponse;
    /**
     * Link to all the issuance config bindings that are using this credential.
     */
    @IsEmpty()
    @OneToMany(
        () => CredentialIssuanceBinding,
        (binding) => binding.credentialConfig,
    )
    credentialIssuanceBindings: CredentialIssuanceBinding[];
}
