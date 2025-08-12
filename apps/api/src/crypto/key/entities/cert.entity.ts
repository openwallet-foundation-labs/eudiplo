import { Column, Entity } from 'typeorm';

export type CertificateType = 'access' | 'signing';

/**
 * Entity to manage certificates for keys.
 */
@Entity()
export class CertEntity {
  /**
   * Unique identifier for the key.
   */
  @Column('varchar', { primary: true })
  id: string;

  /**
   * Tenant ID for the key.
   */
  @Column('varchar', { primary: true })
  tenantId: string;

  /**
   * Certificate in PEM format.
   */
  @Column('varchar')
  crt: string;

  /**
   * Type of the certificate (access or signing).
   */
  @Column('varchar', { default: 'signing', primary: true })
  type: CertificateType;

  /**
   * Description of the key.
   */
  @Column('varchar', { nullable: true })
  description?: string;
}
