/**
 * Helper to convert Uint8Array<ArrayBufferLike> to Uint8Array<ArrayBuffer>
 * This is needed due to TypeScript version differences where newer TS versions
 * use Uint8Array<ArrayBufferLike> which is not assignable to BufferSource.
 *
 * Used primarily for mDOC operations where the @animo-id/mdoc library
 * requires Uint8Array<ArrayBuffer>.
 *
 * @param bytes - The Uint8Array to convert
 * @returns A Uint8Array<ArrayBuffer> that can be used with BufferSource APIs
 */
export const toBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
    return new Uint8Array(bytes) as unknown as Uint8Array<ArrayBuffer>;
};
