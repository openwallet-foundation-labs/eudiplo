import {
    RevocationCheckMode,
    type TrustListRef,
} from "../../../../../trust/types.js";

/**
 * Status check mode for wallet attestations when neither the authorization
 * server nor the issuance configuration sets one: a status list that cannot
 * be fetched is tolerated, an unreadable list or a revoked attestation is not.
 */
const DEFAULT_WALLET_ATTESTATION_STATUS_CHECK_MODE =
    RevocationCheckMode.BestEffort;

export interface WalletAttestationPolicyConfig {
    walletAttestationRequired?: boolean | null;
    walletProviderTrustLists?: TrustListRef[] | null;
    walletAttestationStatusCheckMode?: RevocationCheckMode | null;
}

export interface ResolvedWalletAttestationPolicy {
    walletAttestationRequired: boolean;
    walletProviderTrustLists: TrustListRef[];
    walletAttestationStatusCheckMode: RevocationCheckMode;
}

export function resolveWalletAttestationPolicy(
    issuanceConfig: WalletAttestationPolicyConfig,
    authorizationServerConfig?: WalletAttestationPolicyConfig,
): ResolvedWalletAttestationPolicy {
    return {
        walletAttestationRequired:
            authorizationServerConfig?.walletAttestationRequired ??
            issuanceConfig.walletAttestationRequired ??
            false,
        walletProviderTrustLists:
            authorizationServerConfig?.walletProviderTrustLists ??
            issuanceConfig.walletProviderTrustLists ??
            [],
        walletAttestationStatusCheckMode:
            authorizationServerConfig?.walletAttestationStatusCheckMode ??
            issuanceConfig.walletAttestationStatusCheckMode ??
            DEFAULT_WALLET_ATTESTATION_STATUS_CHECK_MODE,
    };
}
