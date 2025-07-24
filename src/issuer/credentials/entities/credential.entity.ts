import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { IsObject, IsOptional } from 'class-validator';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { VCT } from '../../credentials-metadata/dto/credential-config.dto';
import { SchemaResponse } from '../../credentials-metadata/dto/schema-response.dto';
import { IssuanceConfig } from '../../issuance/entities/issuance-config.entity';

@Entity()
export class CredentialConfig {
    @Column('varchar', { primary: true })
    id: string;
    @Column('varchar', { primary: true })
    tenantId: string;
    @Column('json')
    @IsObject()
    config: CredentialConfigurationSupported;
    // default values to be used
    @Column('json', { nullable: true })
    @IsObject()
    claims: Record<string, any>;
    @Column('json', { nullable: true })
    @IsObject()
    disclosureFrame: Record<string, any>;
    @Column('json', { nullable: true })
    @IsObject()
    @IsOptional()
    vct?: VCT;
    @Column('json', { nullable: true })
    @IsObject()
    @IsOptional()
    schema?: SchemaResponse;
    @ManyToMany(
        () => IssuanceConfig,
        (issuanceConfig) => issuanceConfig.credentialConfigs,
        { cascade: true },
    )
    @JoinTable()
    issuanceConfig: IssuanceConfig[];
}
