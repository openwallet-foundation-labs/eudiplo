import { DeviceResponse, SessionTranscript } from "@animo-id/mdoc";
import { X509Certificate } from "@peculiar/x509";
import { calculateJwkThumbprint } from "jose";
import { mdocContext } from "./mdl-context";

type SessionData = {
    protocol: "openid4vp";
    nonce: string;
    response_mode: string;
    origin: string;
};

export const multipazCert = new X509Certificate(`-----BEGIN CERTIFICATE-----
MIICpjCCAi2gAwIBAgIQppbv4q+OlkVlP80RqXkz2jAKBggqhkjOPQQDAzAuMR8wHQYDVQQDDBZP
V0YgTXVsdGlwYXogVEVTVCBJQUNBMQswCQYDVQQGDAJVUzAeFw0yNDEyMDEwMDAwMDBaFw0zNDEy
MDEwMDAwMDBaMC4xHzAdBgNVBAMMFk9XRiBNdWx0aXBheiBURVNUIElBQ0ExCzAJBgNVBAYMAlVT
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE+QDye70m2O0llPXMjVjxVZz3m5k6agT+wih+L79b7jyq
Ul99sbeUnpxaLD+cmB3HK3twkA7fmVJSobBc+9CDhkh3mx6n+YoH5RulaSWThWBfMyRjsfVODkos
HLCDnbPVo4IBDjCCAQowDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQAwTAYDVR0S
BEUwQ4ZBaHR0cHM6Ly9naXRodWIuY29tL29wZW53YWxsZXQtZm91bmRhdGlvbi1sYWJzL2lkZW50
aXR5LWNyZWRlbnRpYWwwVgYDVR0fBE8wTTBLoEmgR4ZFaHR0cHM6Ly9naXRodWIuY29tL29wZW53
YWxsZXQtZm91bmRhdGlvbi1sYWJzL2lkZW50aXR5LWNyZWRlbnRpYWwvY3JsMB0GA1UdDgQWBBSr
ZRvgVsKQU/Hdf2zkh75o3mDJ9TAfBgNVHSMEGDAWgBSrZRvgVsKQU/Hdf2zkh75o3mDJ9TAKBggq
hkjOPQQDAwNnADBkAjAayUhms4g7vRWRl7M33yehX9F6astAx7jVh2eVHR1qiibfxQYQMAAFfieG
0XgRIoQCMFXBX5/nFGuCOlYCQKgiwxKxfU1BvudpZA31z125C7YtvKGRuVbsJxhbd3w1d7N0vw==
-----END CERTIFICATE-----`);

export const encPubKey = {
    kty: "EC",
    use: "enc",
    crv: "P-256",
    kid: "key-1",
    x: "ICobFkIt6Q3zDRTh9V_9Foy-lZ96dv_Fx8mTxT_fmKc",
    y: "7N3F9JRjXZkZZIWMeRjM-6uXbvQX94cnHL-sBJssqxM",
    alg: "ECDH-ES",
};

async function verifyDeviceAuth(
    deviceResponse: DeviceResponse,
    sessionData: SessionData,
) {
    const { nonce, origin, response_mode } = sessionData;
    const thumbprint = await calculateJwkThumbprint(encPubKey);
    const thumbprintBytes = Buffer.from(thumbprint, "base64url");

    try {
        await deviceResponse.verify(
            {
                sessionTranscript: await SessionTranscript.forOid4VpDcApi(
                    {
                        origin,
                        nonce,
                        jwkThumbprint:
                            response_mode === "dc_api.jwt"
                                ? thumbprintBytes
                                : undefined,
                    },
                    mdocContext,
                ),
                trustedCertificates: [new Uint8Array(multipazCert.rawData)],
                disableCertificateChainValidation: false,
            },
            mdocContext,
        );
    } catch (error) {
        console.log(error);
        return false;
    }
    return true;
}

export async function verifyMDoc(vp: string, sessionData: SessionData) {
    const uint8Array = Buffer.from(vp, "base64url");

    const deviceResponse = DeviceResponse.decode(uint8Array);
    const mdlDocument = deviceResponse.documents?.[0];

    if (!mdlDocument) {
        throw new Error("MDL document not found");
    }

    const issuerSigned = mdlDocument.issuerSigned;
    const claims = issuerSigned.getPrettyClaims("org.iso.18013.5.1");
    const deviceVerified = await verifyDeviceAuth(deviceResponse, sessionData);

    return {
        verified: deviceVerified,
        claims,
        payload: vp,
    };
}
