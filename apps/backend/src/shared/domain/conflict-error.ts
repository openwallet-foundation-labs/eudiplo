/**
 * Base class for transport-neutral "resource already exists" errors raised by
 * application/domain code and repository adapters. The HTTP boundary
 * (`AllExceptionsFilter`) maps every subclass to 409.
 */
export abstract class ConflictError extends Error {}
