/**
 * Predefined schema metadata vocabularies of the registrar, as listed by its
 * `GET /schema-metadata/vocabularies`. Kept free of Nest and Swagger imports
 * because the publish request schema, which the docs render, uses them too.
 */
export const CATEGORY_VALUES = [
    "identity",
    "health",
    "finance",
    "education",
    "mobility",
    "employment",
    "other",
] as const;
export type SchemaMetadataCategory = (typeof CATEGORY_VALUES)[number];

export const TAG_VALUES = [
    "pid",
    "eudi",
    "kyc",
    "aml",
    "age-verification",
    "residency",
    "membership",
    "education",
    "employment",
    "mobility",
] as const;
export type SchemaMetadataTag = (typeof TAG_VALUES)[number];
