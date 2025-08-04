import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { CredentialConfig } from '../../credentials/entities/credential.entity';
import { IssuanceConfig } from './issuance-config.entity';

/**
 * Junction entity for the many-to-many relationship between CredentialConfig and IssuanceConfig
 * with additional keyID attribute for specifying which key should be used for signing.
 */
@Entity()
export class CredentialIssuanceBinding {
    @PrimaryColumn()
    credentialConfigId: string;

    @PrimaryColumn()
    issuanceConfigId: string;

    /**
     * Reference to the credential configuration.
     */
    @ManyToOne(
        () => CredentialConfig,
        (credentialConfig) => credentialConfig.credentialIssuanceBindings,
    )
    credentialConfig: CredentialConfig;

    /**
     * Reference to the issuance configuration.
     */
    @ManyToOne(
        () => IssuanceConfig,
        (issuanceConfig) => issuanceConfig.credentialIssuanceBindings,
    )
    issuanceConfig: IssuanceConfig;

    /**
     * Key ID that should be used for signing this specific credential in this issuance config.
     */
    @Column('varchar', { nullable: true })
    keyID: string;

    /**
     * The timestamp when the binding was created.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt?: Date;
}
