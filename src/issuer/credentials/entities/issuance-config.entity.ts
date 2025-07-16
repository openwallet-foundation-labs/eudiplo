import { CredentialConfigurationSupported } from '@openid4vc/openid4vci';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Column, Entity } from 'typeorm';
import { VCT, PresentationDuringIssuance } from '../dto/credential-config.dto';
import { SchemaResponse } from '../dto/schema-response.dto';
import { ApiHideProperty } from '@nestjs/swagger';

@Entity()
export class IssuanceConfig {
    @Column('varchar', { primary: true })
    @IsString()
    id: string;
    @ApiHideProperty()
    @Column('varchar', { primary: true })
    tenantId: string;
    @Column('json')
    @IsObject()
    config: CredentialConfigurationSupported;
    @Column('json')
    // default values to be used
    @IsObject()
    claims: Record<string, any>;
    @Column('json')
    @IsObject()
    disclosureFrame: Record<string, any>;
    @Column('json', { nullable: true })
    @IsObject()
    @IsOptional()
    vct?: VCT;
    @Column('json', { nullable: true })
    @IsObject()
    @IsOptional()
    presentation_during_issuance?: PresentationDuringIssuance;
    @Column('json', { nullable: true })
    @IsObject()
    @IsOptional()
    schema?: SchemaResponse;
    /**
     * The timestamp when the VP request was created.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}
