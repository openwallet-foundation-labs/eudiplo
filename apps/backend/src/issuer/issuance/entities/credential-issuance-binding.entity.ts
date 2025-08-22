import {
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from "typeorm";
import { CredentialConfig } from "../../credentials/entities/credential.entity";
import { IssuanceConfig } from "./issuance-config.entity";

//TODO: check if we really need this table and not just go with a many-to-many relationship
/**
 * Junction entity for the many-to-many relationship between CredentialConfig and IssuanceConfig
 * with additional keyID attribute for specifying which key should be used for signing.
 */
@Entity()
export class CredentialIssuanceBinding {
    /**
     * Binding key for the credential configuration.
     */
    @PrimaryColumn()
    credentialConfigId: string;

    /**
     * Binding key for the issuance configuration.
     */
    @PrimaryColumn()
    issuanceConfigId: string;

    /**
     * Reference to the credential configuration.
     */
    @ManyToOne(
        () => CredentialConfig,
        (credentialConfig) => credentialConfig.credentialIssuanceBindings,
        { onDelete: "CASCADE" },
    )
    credentialConfig: CredentialConfig;

    /**
     * Reference to the issuance configuration.
     */
    @ManyToOne(
        () => IssuanceConfig,
        (issuanceConfig) => issuanceConfig.credentialIssuanceBindings,
        { onDelete: "CASCADE" },
    )
    issuanceConfig: IssuanceConfig;

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt: Date;
}
