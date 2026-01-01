import { JWK } from "jose";

export type RulebookTrustListRef = {
    url: string; // e.g. https://.../pid-provider.jwt
    // material to verify the trustlist JWT (out of scope here)
    // could be JWK, PEM, kid, etc.
    verifierKey?: JWK;
};

export type ServiceTypeIdentifier = string;

export type VerifierOptions = {
    trustListSource: TrustListSource;
    policy: VerifyPolicy;
};

export type TrustListSource = {
    lotes: RulebookTrustListRef[];
    // which service types from LoTE you want to accept as issuer identities
    acceptedServiceTypes?: ServiceTypeIdentifier[];
};

export type VerifyPolicy = {
    requireX5c: boolean;
    revocation?: {
        enabled: boolean;
        failClosed?: boolean;
        fetchTimeoutMs?: number;
        cacheTtlMs?: number;
    };
    // If LoTE cert is CA=FALSE, treat it as pin:
    // - "leaf": require leaf cert to equal pinned cert
    // - "pathEnd": require chain to terminate at pinned cert (rare)
    pinnedCertMode?: "leaf" | "pathEnd";
};
