export const FEDERATION_ENTITY_PROVIDER_SETTINGS = Symbol(
    "FEDERATION_ENTITY_PROVIDER_SETTINGS",
);

/** Where the tenant's own entity configuration comes from (`FEDERATION_ENTITY_PROVIDER`). */
export type FederationEntityProviderSettings =
    | { type: "local" }
    | { type: "http"; url: string; token?: string };
