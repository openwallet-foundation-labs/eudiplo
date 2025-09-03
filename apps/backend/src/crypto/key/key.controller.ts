import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Post,
    Put,
} from "@nestjs/common";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { CryptoService } from "../crypto.service";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { CertEntity } from "./entities/cert.entity";
import { KeyService } from "./key.service";

/**
 * KeyController is responsible for managing keys in the system.
 */
@Secured([Role.Issuances, Role.Presentations])
@Controller("key")
export class KeyController {
    constructor(
        @Inject("KeyService") public readonly keyService: KeyService,
        private cryptoService: CryptoService,
    ) {}

    /**
     * Get all keys for the tenant.
     * @param token
     * @returns
     */
    @Get()
    getKeys(@Token() token: TokenPayload): Promise<CertEntity[]> {
        const tenantId = token.sub;
        return this.cryptoService.getCerts(tenantId);
    }

    /**
     * Add a new key to the key service.
     * @param token
     * @param body
     * @returns
     */
    @Post()
    async addKey(
        @Token() token: TokenPayload,
        @Body() body: KeyImportDto,
    ): Promise<{ id: string }> {
        const id = await this.cryptoService.importKey(token.entity!, body);
        return { id };
    }

    /**
     * Updates an existing key in the key service.
     * @param token
     * @param id
     * @param body
     */
    @Put(":id")
    async updateKey(
        @Token() token: TokenPayload,
        @Param("id") id: string,
        @Body() body: UpdateKeyDto,
    ): Promise<void> {
        const tenantId = token.sub;
        await this.cryptoService.updateCert(tenantId, id, body);
    }

    /**
     * Delete a key from the key service.
     * @param token
     * @param id
     */
    @Delete(":id")
    deleteKey(@Token() token: TokenPayload, @Param("id") id: string) {
        return this.cryptoService.deleteKey(token.sub, id);
    }
}
