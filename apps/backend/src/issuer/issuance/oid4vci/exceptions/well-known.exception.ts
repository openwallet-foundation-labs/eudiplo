import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Exception for Well-Known endpoint errors.
 *
 * Thrown when metadata or JWKS retrieval fails due to configuration
 * issues, missing keys, or tenant-related problems.
 */
export class WellKnownException extends HttpException {
    constructor(message: string, status: HttpStatus = HttpStatus.NOT_FOUND) {
        super(
            {
                error: "well_known_error",
                error_description: message,
            },
            status,
        );
    }
}
