import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { CredentialConfig } from '../../credentials/entities/credential.entity';
import { IssuanceConfig } from './issuance-config.entity';

//TODO: check if we really need this table and not just go with a many-to-many relationship
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
     * The timestamp when the binding was created.
     */
    @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
    createdAt?: Date;
}
