type CredentialResponseEncryptionInput = {
    jwk: Record<string, unknown> & { alg?: string };
    alg?: string;
    [key: string]: unknown;
};

type CredentialRequestEncryptionInput = {
    credential_response_encryption?: CredentialResponseEncryptionInput;
    [key: string]: unknown;
};

/** Add the legacy sibling `alg` expected by older OpenID4VCI parser drafts. */
export function addLegacyCredentialResponseEncryptionAlg<
    T extends CredentialRequestEncryptionInput,
>(request: T): T {
    const encryption = request.credential_response_encryption;
    if (!encryption || encryption.alg || !encryption.jwk.alg) return request;

    return {
        ...request,
        credential_response_encryption: {
            ...encryption,
            alg: encryption.jwk.alg,
        },
    } as T;
}

/**
 * Drop a `zip` the issuer does not advertise in `zip_values_supported`, so the
 * response is sent uncompressed instead of the request being refused.
 * OpenID4VCI 1.0 does not say which of the two an issuer must do. The OIDF
 * module `oid4vci-1_0-issuer-happy-flow` sends `zip: "DEF"` in its encrypted
 * variant and accepts an uncompressed response when `DEF` is not advertised.
 */
export function dropUnsupportedCredentialResponseCompression<
    T extends CredentialRequestEncryptionInput,
>(request: T, zipValuesSupported: readonly string[] | undefined): T {
    const encryption = request.credential_response_encryption;
    const zip = encryption?.zip;
    // A non-string zip is malformed and left for the parser to refuse.
    if (
        !encryption ||
        typeof zip !== "string" ||
        zipValuesSupported?.includes(zip)
    ) {
        return request;
    }

    const { zip: _zip, ...withoutZip } = encryption;
    return {
        ...request,
        credential_response_encryption: withoutZip,
    } as T;
}
