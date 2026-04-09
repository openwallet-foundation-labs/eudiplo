import { BadRequestException } from "@nestjs/common";

/**
 * Exception thrown when a presentation response does not satisfy the DCQL query requirements.
 * This includes missing credentials, missing claims, or unsatisfied credential sets.
 */
export class IncompletePresentationException extends BadRequestException {
    constructor(
        message: string,
        public readonly details?: {
            missingCredentials?: string[];
            missingClaims?: Record<string, string[]>;
            unsatisfiedCredentialSets?: number[];
        },
    ) {
        super({
            message,
            error: "Incomplete Presentation",
            details,
        });
    }
}
