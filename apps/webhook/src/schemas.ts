/**
 * Zod Schemas for EUDIPLO Webhook Validation
 *
 * These schemas provide runtime validation with detailed error messages.
 * They mirror the types in types.ts but provide actual validation.
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Disclosed claims from a presented credential.
 */
export const DisclosedClaimsSchema = z.record(z.string(), z.unknown());

/**
 * Presented credential information sent in claims webhook.
 */
export const PresentedCredentialSchema = z.object({
    id: z.string({ message: "credentials[].id is required" }),
    values: z.array(DisclosedClaimsSchema, {
        message: "credentials[].values is required",
    }),
});

/**
 * Identity context from authorization server.
 */
export const AuthorizationIdentitySchema = z.object({
    iss: z.string({ message: "identity.iss is required" }),
    sub: z.string({ message: "identity.sub is required" }),
    token_claims: z.record(z.string(), z.unknown(), {
        message: "identity.token_claims is required",
    }),
});

// ============================================================================
// Claims Webhook Schema
// ============================================================================

/**
 * Schema for claims webhook request payload.
 */
export const ClaimsWebhookRequestSchema = z.object({
    session: z.string({ message: "session is required" }),
    credential_configuration_id: z.string({
        message: "credential_configuration_id is required",
    }),
    identity: AuthorizationIdentitySchema.optional(),
    credentials: z.array(PresentedCredentialSchema).optional(),
});

// ============================================================================
// Notification Webhook Schema
// ============================================================================

/**
 * Notification event types.
 */
export const NotificationEventSchema = z.enum([
    "credential_accepted",
    "credential_failure",
    "credential_deleted",
]);

/**
 * Notification information.
 */
export const NotificationSchema = z.object({
    id: z.string({ message: "notification.id is required" }),
    event: NotificationEventSchema.optional(),
    credentialConfigurationId: z.string({
        message: "notification.credentialConfigurationId is required",
    }),
});

/**
 * Schema for notification webhook request payload.
 */
export const NotificationWebhookRequestSchema = z.object({
    notification: NotificationSchema,
    session: z.string({ message: "session is required" }),
});

// ============================================================================
// Inferred Types (for use when you need pure types)
// ============================================================================

export type ClaimsWebhookRequest = z.infer<typeof ClaimsWebhookRequestSchema>;
export type NotificationWebhookRequest = z.infer<
    typeof NotificationWebhookRequestSchema
>;
export type AuthorizationIdentity = z.infer<typeof AuthorizationIdentitySchema>;
export type PresentedCredential = z.infer<typeof PresentedCredentialSchema>;

// ============================================================================
// Validation Results
// ============================================================================

/**
 * Result of schema validation - either success with data or error with details.
 */
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; details: z.ZodError["issues"] };

/**
 * Validates data against the ClaimsWebhookRequest schema.
 * Returns parsed data on success or detailed error messages on failure.
 */
export function validateClaimsWebhookRequest(
    data: unknown,
): ValidationResult<ClaimsWebhookRequest> {
    const result = ClaimsWebhookRequestSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: formatZodError(result.error),
        details: result.error.issues,
    };
}

/**
 * Validates data against the NotificationWebhookRequest schema.
 * Returns parsed data on success or detailed error messages on failure.
 */
export function validateNotificationWebhookRequest(
    data: unknown,
): ValidationResult<NotificationWebhookRequest> {
    const result = NotificationWebhookRequestSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: formatZodError(result.error),
        details: result.error.issues,
    };
}

/**
 * Format Zod errors into a human-readable string.
 */
export function formatZodError(error: z.ZodError): string {
    return error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join(".") : "root";
            return `${path}: ${issue.message}`;
        })
        .join("; ");
}

// ============================================================================
// Type Guards (still useful for runtime checks after validation)
// ============================================================================

/**
 * Type guard to check if a ClaimsWebhookRequest has identity information.
 */
export function hasIdentity(
    request: ClaimsWebhookRequest,
): request is ClaimsWebhookRequest & { identity: AuthorizationIdentity } {
    return request.identity !== undefined;
}

/**
 * Type guard to check if a ClaimsWebhookRequest has presented credentials.
 */
export function hasCredentials(
    request: ClaimsWebhookRequest,
): request is ClaimsWebhookRequest & { credentials: PresentedCredential[] } {
    return request.credentials !== undefined && request.credentials.length > 0;
}
