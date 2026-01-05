/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "LoTEVersionIdentifier".
 */
export type LoTEVersionIdentifier = number;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "LoTESequenceNumber".
 */
export type LoTESequenceNumber = number;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "LoTEType".
 */
export type LoTEType = string;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeOperatorName".
 */
export type SchemeOperatorName = [MultiLangString, ...MultiLangString[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "PostalAddresses".
 */
export type PostalAddresses = [PostalAddress, ...PostalAddress[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ElectronicAddress".
 */
export type ElectronicAddress = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeName".
 */
export type SchemeName = [MultiLangString, ...MultiLangString[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeInformationURI".
 */
export type SchemeInformationURI = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "StatusDeterminationApproach".
 */
export type StatusDeterminationApproach = string;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeTypeCommunityRules".
 */
export type SchemeTypeCommunityRules = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeTerritory".
 */
export type SchemeTerritory = string;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "PolicyOrLegalNotice".
 */
export type PolicyOrLegalNotice = PolicyOrLegalNotice1 & PolicyOrLegalNotice2;
export type PolicyOrLegalNotice1 =
    | {
          LoTEPolicy: NonEmptyMultiLangURI;
          [k: string]: unknown;
      }[]
    | {
          LoTELegalNotice: string;
          [k: string]: unknown;
      }[];
export type PolicyOrLegalNotice2 = [unknown, ...unknown[]];
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "HistoricalInformationPeriod".
 */
export type HistoricalInformationPeriod = number;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "PointersToOtherLoTE".
 */
export type PointersToOtherLoTE = [OtherLoTEPointer, ...OtherLoTEPointer[]];
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "X509SubjectName".
 */
export type X509SubjectName = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "X509SKI".
 */
export type X509SKI = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "OtherId".
 */
export type OtherId = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "MimeType".
 */
export type MimeType = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ListIssueDateTime".
 */
export type ListIssueDateTime = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "NextUpdate".
 */
export type NextUpdate = string;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "DistributionPoints".
 */
export type DistributionPoints = [string, ...string[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeExtensions".
 */
export type SchemeExtensions = [unknown, ...unknown[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TrustedEntitiesList".
 */
export type TrustedEntitiesList = [TrustedEntity, ...TrustedEntity[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TEName".
 */
export type TEName = [MultiLangString, ...MultiLangString[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TETradeName".
 */
export type TETradeName = [MultiLangString, ...MultiLangString[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TEInformationURI".
 */
export type TEInformationURI = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TEInformationExtensions".
 */
export type TEInformationExtensions = [unknown, ...unknown[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TrustedEntityServices".
 */
export type TrustedEntityServices = [
    TrustedEntityService,
    ...TrustedEntityService[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceName".
 */
export type ServiceName = [MultiLangString, ...MultiLangString[]];
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceTypeIdentifier".
 */
export type ServiceTypeIdentifier = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceStatus".
 */
export type ServiceStatus = string;
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "StatusStartingTime".
 */
export type StatusStartingTime = string;
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeServiceDefinitionURI".
 */
export type SchemeServiceDefinitionURI = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceSupplyPoints".
 */
export type ServiceSupplyPoints = [
    ServiceSupplyPointURI,
    ...ServiceSupplyPointURI[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceDefinitionURI".
 */
export type ServiceDefinitionURI = [
    NonEmptyMultiLangURI,
    ...NonEmptyMultiLangURI[],
];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceInformationExtensions".
 */
export type ServiceInformationExtensions = [unknown, ...unknown[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceHistory".
 */
export type ServiceHistory = [
    ServiceHistoryInstance,
    ...ServiceHistoryInstance[],
];

export interface JsonSchemaV00 {
    LoTE: LoTE;
    $schema?: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "LoTE".
 */
export interface LoTE {
    ListAndSchemeInformation: ListAndSchemeInformation;
    TrustedEntitiesList?: TrustedEntitiesList;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ListAndSchemeInformation".
 */
export interface ListAndSchemeInformation {
    LoTEVersionIdentifier: LoTEVersionIdentifier;
    LoTESequenceNumber: LoTESequenceNumber;
    LoTEType?: LoTEType;
    SchemeOperatorName: SchemeOperatorName;
    SchemeOperatorAddress?: SchemeOperatorAddress;
    SchemeName?: SchemeName;
    SchemeInformationURI?: SchemeInformationURI;
    StatusDeterminationApproach?: StatusDeterminationApproach;
    SchemeTypeCommunityRules?: SchemeTypeCommunityRules;
    SchemeTerritory?: SchemeTerritory;
    PolicyOrLegalNotice?: PolicyOrLegalNotice;
    HistoricalInformationPeriod?: HistoricalInformationPeriod;
    PointersToOtherLoTE?: PointersToOtherLoTE;
    ListIssueDateTime: ListIssueDateTime;
    NextUpdate: NextUpdate;
    DistributionPoints?: DistributionPoints;
    SchemeExtensions?: SchemeExtensions;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "multiLangString".
 */
export interface MultiLangString {
    lang: string;
    value: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "SchemeOperatorAddress".
 */
export interface SchemeOperatorAddress {
    SchemeOperatorPostalAddress: PostalAddresses;
    SchemeOperatorElectronicAddress: ElectronicAddress;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "PostalAddress".
 */
export interface PostalAddress {
    lang: string;
    StreetAddress: string;
    Locality?: string;
    StateOrProvince?: string;
    PostalCode?: string;
    Country: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "NonEmptyMultiLangURI".
 */
export interface NonEmptyMultiLangURI {
    lang: string;
    uriValue: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "OtherLoTEPointer".
 */
export interface OtherLoTEPointer {
    LoTELocation: string;
    /**
     * @minItems 1
     */
    ServiceDigitalIdentities: [
        ServiceDigitalIdentity,
        ...ServiceDigitalIdentity[],
    ];
    /**
     * @minItems 1
     */
    LoTEQualifiers: [LoTEQualifier, ...LoTEQualifier[]];
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceDigitalIdentity".
 */
export interface ServiceDigitalIdentity {
    /**
     * @minItems 1
     */
    X509Certificates?: [PkiOb, ...PkiOb[]];
    /**
     * @minItems 1
     */
    X509SubjectNames?: [X509SubjectName, ...X509SubjectName[]];
    /**
     * @minItems 1
     */
    PublicKeyValues?: [Jwk, ...Jwk[]];
    /**
     * @minItems 1
     */
    X509SKIs?: [X509SKI, ...X509SKI[]];
    /**
     * @minItems 1
     */
    OtherIds?: [OtherId, ...OtherId[]];
    additionalProperties?: never;
    [k: string]: unknown;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "pkiOb".
 */
export interface PkiOb {
    encoding?: string;
    specRef?: string;
    val: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "PublicKeyValue".
 */
export interface Jwk {
    kty: "EC" | "RSA" | "oct";
    use?: "sig" | "enc";
    key_ops?:
        | "sign"
        | "verify"
        | "encrypt"
        | "decrypt"
        | "wrapKey"
        | "unwrapKey"
        | "deriveKey"
        | "deriveBits";
    alg?: string;
    kid?: string;
    x5u?: string;
    x5c?: string[];
    x5t?: string;
    "x5t#S256"?: string;
    [k: string]: unknown;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "LoTEQualifier".
 */
export interface LoTEQualifier {
    LoTEType: LoTEType;
    SchemeOperatorName: SchemeOperatorName;
    SchemeTypeCommunityRules?: SchemeTypeCommunityRules;
    SchemeTerritory?: SchemeTerritory;
    MimeType: MimeType;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TrustedEntity".
 */
export interface TrustedEntity {
    TrustedEntityInformation: TrustedEntityInformation;
    TrustedEntityServices: TrustedEntityServices;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TrustedEntityInformation".
 */
export interface TrustedEntityInformation {
    TEName: TEName;
    TETradeName?: TETradeName;
    TEAddress: TEAddress;
    TEInformationURI: TEInformationURI;
    TEInformationExtensions?: TEInformationExtensions;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TEAddress".
 */
export interface TEAddress {
    TEPostalAddress: PostalAddresses;
    TEElectronicAddress: ElectronicAddress;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "TrustedEntityService".
 */
export interface TrustedEntityService {
    ServiceInformation: ServiceInformation;
    ServiceHistory?: ServiceHistory;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceInformation".
 */
export interface ServiceInformation {
    ServiceName: ServiceName;
    ServiceDigitalIdentity: ServiceDigitalIdentity;
    ServiceTypeIdentifier?: ServiceTypeIdentifier;
    ServiceStatus?: ServiceStatus;
    StatusStartingTime?: StatusStartingTime;
    SchemeServiceDefinitionURI?: SchemeServiceDefinitionURI;
    ServiceSupplyPoints?: ServiceSupplyPoints;
    ServiceDefinitionURI?: ServiceDefinitionURI;
    ServiceInformationExtensions?: ServiceInformationExtensions;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceSupplyPointURI".
 */
export interface ServiceSupplyPointURI {
    ServiceType?: string;
    uriValue: string;
}
/**
 * This interface was referenced by `60201JsonSchemaV00`'s JSON-Schema
 * via the `definition` "ServiceHistoryInstance".
 */
export interface ServiceHistoryInstance {
    ServiceName: ServiceName;
    ServiceDigitalIdentity: ServiceDigitalIdentity;
    ServiceStatus: ServiceStatus;
    StatusStartingTime: StatusStartingTime;
    ServiceTypeIdentifier?: ServiceTypeIdentifier;
    ServiceInformationExtensions?: ServiceInformationExtensions;
}
