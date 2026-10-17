import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionNotUsable } from "../../../session/domain/session-usability.js";
import {
    CredentialOfferNotFound,
    RetrieveCredentialOffer,
} from "./application/retrieve-credential-offer.js";

@ApiTags("OID4VCI")
@ApiParam({ name: "tenantId", required: true })
@Controller("issuers/:tenantId/vci")
export class CredentialOfferReferenceController {
    constructor(
        private readonly retrieveCredentialOffer: RetrieveCredentialOffer,
    ) {}

    @Get("credential-offers/:offerId")
    @ApiOperation({ summary: "Resolve a credential offer by reference" })
    @ApiParam({
        name: "offerId",
        required: true,
        description:
            "The last path segment of the offer's `credential_offer_uri`; the session ID is not accepted.",
    })
    @ApiResponse({ status: 200, description: "Credential offer" })
    @ApiResponse({
        status: 404,
        description:
            "Credential offer not found, already used, expired or its session is finished",
    })
    async credentialOfferByReference(
        @Param("tenantId") tenantId: string,
        @Param("offerId") offerId: string,
    ) {
        try {
            return await this.retrieveCredentialOffer.execute(
                tenantId,
                offerId,
            );
        } catch (error) {
            if (
                error instanceof CredentialOfferNotFound ||
                error instanceof SessionNotUsable
            ) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}
