/**
 * Extracts the raw token (e.g., SD-JWT, mDoc) for a specific credential ID
 * based on the OpenID4VP presentation_submission descriptor_map.
 *
 * @param credentialId The ID of the credential requested (e.g., 'sca_credential')
 * @param rawPayload The raw OID4VP presentation response from the wallet
 * @returns The raw cryptographic token as a string, or null if not found/parseable
 */
export function extractRawTokenFromSubmission(
    credentialId: string, 
    rawPayload: any
): string | null {
    try {
        const submission = rawPayload?.presentation_submission;
        const vpToken = rawPayload?.vp_token;

        if (!submission?.descriptor_map || !vpToken) {
            return null;
        }

        // Find the entry in the descriptor_map that corresponds to this ID
        const descriptor = submission.descriptor_map.find((d: any) => d.id === credentialId);
        
        if (!descriptor) {
            return null;
        }

        const path = descriptor.path; // e.g., "$", "$[0]", "$[1]"

        // Logic according to the OID4VP specification:
        // If vp_token is a single string, the path is usually "$" or "$[0]"
        if (typeof vpToken === 'string' && (path === '$' || path === '$[0]')) {
            return vpToken;
        }

        // If vp_token is an array (multiple presentations in a single request)
        if (Array.isArray(vpToken)) {
            // Parse the JSONPath (basic implementation for $[0], $[1], etc.)
            const match = path.match(/\$\[(\d+)\]/);
            if (match && match[1]) {
                const index = parseInt(match[1], 10);
                return vpToken[index] || null;
            }
        }

        return null;
    } catch (error) {
        // Fallback to prevent the webhook from crashing due to a parsing error
        return null; 
    }
}