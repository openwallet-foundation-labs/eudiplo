import { IsOptional, IsObject } from 'class-validator';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PresentationDuringIssuance } from '../../credentials-metadata/dto/credential-config.dto';
import { ApiHideProperty } from '@nestjs/swagger';
import { CredentialConfig } from '../../credentials/entities/credential.entity';

@Entity()
export class IssuanceConfig {
    /**
     * Unique identifier for the issuance configuration.
     */
    @PrimaryGeneratedColumn('uuid')
    id: string;
    /**
     * Tenant ID for the issuance configuration.
     */
    @ApiHideProperty()
    @Column('varchar')
    tenantId: string;

    @ManyToMany(
        () => CredentialConfig,
        (credentialConfig) => credentialConfig.issuanceConfig,
    )
    credentialConfigs: CredentialConfig[];

    /**
     * Presentation during issuance configuration.
     * This is optional and can be used to specify how the presentation should be handled during the issuance process.
     */
    @IsObject()
    @IsOptional()
    @Column('json', { nullable: true })
    presentation_during_issuance?: PresentationDuringIssuance;
    /**
     * The timestamp when the VP request was created.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt?: Date;
}
