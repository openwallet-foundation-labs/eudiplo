import { describe, expect, it } from "vitest";
import {
    OTHER_TEST_ROOT_CERTIFICATE_PEM,
    pemToBase64Der,
    TEST_ROOT_CERTIFICATE_PEM,
} from "../../../test/fixtures/test-certificates.js";
import { parsesAsCertificate, readCertificates } from "./x509-certificates.js";

const root = pemToBase64Der(TEST_ROOT_CERTIFICATE_PEM);
const other = pemToBase64Der(OTHER_TEST_ROOT_CERTIFICATE_PEM);
const rootDer = Buffer.from(root, "base64");
const base64 = (...parts: Array<Uint8Array | number[]>) =>
    Buffer.concat(parts.map((part) => Buffer.from(part))).toString("base64");

describe("readCertificates", () => {
    it("reads one certificate in base64 DER, with or without line breaks", () => {
        expect(readCertificates(root)).toEqual({ first: root, count: 1 });
        expect(readCertificates(other)).toEqual({ first: other, count: 1 });
        expect(
            readCertificates(` ${root.replace(/.{64}/g, "$&\n")}\n`),
        ).toEqual({ first: root, count: 1 });
    });

    it("reads one PEM certificate", () => {
        expect(readCertificates(TEST_ROOT_CERTIFICATE_PEM)).toEqual({
            first: root,
            count: 1,
        });
        expect(
            readCertificates(
                `\r\n${OTHER_TEST_ROOT_CERTIFICATE_PEM.replaceAll("\n", "\r\n")}`,
            ),
        ).toEqual({ first: other, count: 1 });
    });

    it("counts the certificates of a PEM chain, padded or not", () => {
        expect(
            readCertificates(
                TEST_ROOT_CERTIFICATE_PEM + OTHER_TEST_ROOT_CERTIFICATE_PEM,
            ),
        ).toEqual({ first: root, count: 2 });
        expect(
            readCertificates(
                `${OTHER_TEST_ROOT_CERTIFICATE_PEM}\n${TEST_ROOT_CERTIFICATE_PEM}`,
            ),
        ).toEqual({ first: other, count: 2 });
    });

    it("counts certificates whose DER is written one after the other", () => {
        const der = base64(Buffer.from(other, "base64"), rootDer);

        expect(readCertificates(der)).toEqual({ first: other, count: 2 });
        // Base64 joined without padding in between decodes to the same.
        expect(readCertificates(root + other)).toEqual({
            first: root,
            count: 2,
        });
    });

    it.each([
        ["an empty value", ""],
        ["whitespace", "  \n "],
        [
            "PEM armor without a body",
            "-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----",
        ],
        [
            "base64url characters",
            root.replaceAll("+", "-").replaceAll("/", "_"),
        ],
        // Node drops a dangling base64 character instead of failing.
        ["a length that is not a multiple of 4", `${root}A`],
        [
            "base64 that is not DER",
            Buffer.from("root certificate").toString("base64"),
        ],
        ["a truncated certificate", base64(rootDer.subarray(0, 300))],
        ["a certificate followed by one byte", base64(rootDer, [0x30])],
        ["a certificate followed by other bytes", base64(rootDer, [5, 0])],
        [
            "a DER SEQUENCE that is not a certificate",
            base64([0x30, 0x03, 0x02, 0x01, 0x01]),
        ],
        [
            "a certificate with a fourth field",
            base64([0x30, 0x82, 0x01, 0x72], rootDer.subarray(4), [5, 0]),
        ],
        [
            "an indefinite length",
            base64([0x30, 0x06, 0x30, 0x80, 0x30, 0x00, 0x03, 0x00]),
        ],
        [
            "more than four length bytes",
            base64([0x30, 0x85, 0, 0, 0, 1, 0x70], rootDer.subarray(4)),
        ],
        ["padded base64 followed by more base64", other + root],
        [
            "text around a PEM block",
            `subject=CN = Test Root 2\n${TEST_ROOT_CERTIFICATE_PEM}`,
        ],
        [
            "a PEM block that is not closed",
            `${TEST_ROOT_CERTIFICATE_PEM}-----BEGIN CERTIFICATE-----\n${other}`,
        ],
        [
            "a PEM block of another type",
            TEST_ROOT_CERTIFICATE_PEM.replaceAll("CERTIFICATE", "PUBLIC KEY"),
        ],
    ])("rejects %s", (_, value) => {
        expect(readCertificates(value)).toBeUndefined();
    });

    it("stays fast on many PEM markers without an end", () => {
        // A regular expression with a lazy body took seconds for this.
        const value = "-----BEGIN CERTIFICATE-----".repeat(40_000);
        const started = performance.now();

        expect(readCertificates(value)).toBeUndefined();
        expect(performance.now() - started).toBeLessThan(500);
    });
});

describe("parsesAsCertificate", () => {
    it("accepts a certificate", () => {
        expect(parsesAsCertificate(root)).toBe(true);
    });

    it("rejects DER that only has the outer shape of a certificate", () => {
        const shape = base64([0x30, 0x06, 0x30, 0x00, 0x30, 0x00, 0x03, 0x00]);

        expect(readCertificates(shape)).toEqual({ first: shape, count: 1 });
        expect(parsesAsCertificate(shape)).toBe(false);
    });
});
