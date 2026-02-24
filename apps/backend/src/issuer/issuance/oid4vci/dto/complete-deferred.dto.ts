import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";
import { DeferredTransactionStatus } from "../entities/deferred-transaction.entity";

/**
 * DTO for completing a deferred transaction
 */
export class CompleteDeferredDto {
    /**
     * Claims to include in the credential.
     * The structure should match the credential configuration's expected claims.
     */
    @ApiProperty({
        description:
            "Claims to include in the credential. The structure should match the credential configuration's expected claims.",
        example: {
            given_name: "John",
            family_name: "Doe",
            birthdate: "1990-01-15",
        },
    })
    @IsObject()
    claims!: Record<string, unknown>;
}

/**
 * DTO for failing a deferred transaction
 */
export class FailDeferredDto {
    /**
     * Optional error message explaining why the issuance failed
     */
    @ApiProperty({
        description:
            "Optional error message explaining why the issuance failed",
        required: false,
        example: "Identity verification failed",
    })
    @IsOptional()
    @IsString()
    error?: string;
}

/**
 * Response for deferred transaction operations
 */
export class DeferredOperationResponse {
    /**
     * The transaction ID
     */
    @ApiProperty({
        description: "The transaction ID",
    })
    transactionId!: string;

    /**
     * The new status of the transaction
     */
    @ApiProperty({
        description: "The new status of the transaction",
        enum: DeferredTransactionStatus,
    })
    status!: DeferredTransactionStatus;

    /**
     * Optional message
     */
    @ApiProperty({
        description: "Optional message",
        required: false,
    })
    message?: string;
}
