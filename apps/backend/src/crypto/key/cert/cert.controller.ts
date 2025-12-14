import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { CertImportDto } from "../dto/cert-import.dto";
import { CertResponseDto } from "../dto/cert-response.dto";
import { CertSelfSignedDto } from "../dto/cert-self-signed.dto";
import { CertUpdateDto } from "../dto/cert-update.dto";
import { CertEntity } from "../entities/cert.entity";
import { CertService } from "./cert.service";

/**
 * Controller for managing certificates.
 */
@Secured([Role.Issuances, Role.Presentations])
@Controller("certs")
export class CertController {
    constructor(private readonly certService: CertService) {}

    /**
     * Get all certificates for the authenticated tenant.
     * Can be filtered by keyId using query parameter.
     * @param token - Authentication token
     * @param keyId - Optional key ID to filter certificates
     * @returns Array of certificates
     */
    @Get()
    @ApiQuery({ name: "keyId", required: false, type: String })
    getCertificates(
        @Token() token: TokenPayload,
        @Query("keyId") keyId?: string,
    ): Promise<CertEntity[]> {
        if (keyId) {
            return this.certService.getCertificates(token.entity!.id, keyId);
        }
        return this.certService.getAllCertificates(token.entity!.id);
    }

    /**
     * Get a specific certificate by ID.
     * @param token - Authentication token
     * @param certId - The certificate ID
     * @returns The certificate
     */
    @Get(":certId")
    getCertificate(
        @Token() token: TokenPayload,
        @Param("certId") certId: string,
    ): Promise<CertEntity> {
        return this.certService.getCertificateById(token.entity!.id, certId);
    }

    /**
     * Add a new certificate to a key.
     * @param token - Authentication token
     * @param body - Certificate data including keyId
     * @returns The created certificate ID
     */
    @Post()
    addCertificate(
        @Token() token: TokenPayload,
        @Body() body: CertImportDto,
    ): Promise<CertResponseDto> {
        return this.certService.addCertificate(
            token.entity!.id,
            body.keyId,
            body,
        );
    }

    /**
     * Generate and add a self-signed certificate.
     * @param token - Authentication token
     * @param dto - Certificate type and keyId
     */
    @Post("self-signed")
    addSelfSignedCert(
        @Token() token: TokenPayload,
        @Body() dto: CertSelfSignedDto,
    ): Promise<CertResponseDto> {
        return this.certService
            .addSelfSignedCert(
                token.entity!,
                dto.keyId,
                dto.isAccessCert,
                dto.isSigningCert,
            )
            .then((id) => ({
                id,
            }));
    }

    /**
     * Update certificate metadata (description and usage types).
     * @param token - Authentication token
     * @param certId - The certificate ID to update
     * @param body - Updated certificate metadata
     */
    @Patch(":certId")
    async updateCertificate(
        @Token() token: TokenPayload,
        @Param("certId") certId: string,
        @Body() body: CertUpdateDto,
    ): Promise<void> {
        await this.certService.updateCertificate(
            token.entity!.id,
            certId,
            body,
        );
    }

    /**
     * Delete a certificate.
     * @param token - Authentication token
     * @param certId - The certificate ID to delete
     */
    @Delete(":certId")
    async deleteCertificate(
        @Token() token: TokenPayload,
        @Param("certId") certId: string,
    ): Promise<void> {
        await this.certService.deleteCertificate(token.entity!.id, certId);
    }
}
