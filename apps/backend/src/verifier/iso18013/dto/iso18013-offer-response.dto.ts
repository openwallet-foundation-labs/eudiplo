/** What the page passes to the DC API and where it posts the answer. */
export class OrgIsoMdocRequest {
    /** base64url-encoded CBOR DeviceRequest */
    device_request!: string;
    /** base64url-encoded CBOR EncryptionInfo */
    encryption_info!: string;
    /**
     * Where the page posts the wallet's encrypted response. Ends with the
     * session's `walletNonce`; the session ID is not accepted there.
     */
    response_uri!: string;
}

/** Offer of `response_type: "iso-18013-7"` (ISO 18013-7 Annex C). */
export class Iso18013OfferResponse {
    /** Session ID, for the management API and webhooks. */
    session!: string;
    /** Always empty: the request goes through `org_iso_mdoc`. */
    uri!: string;
    /** Always empty: the request goes through `org_iso_mdoc`. */
    crossDeviceUri!: string;
    org_iso_mdoc!: OrgIsoMdocRequest;
}
