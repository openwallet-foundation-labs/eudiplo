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
import { KeyEntity } from "./entities/keys.entity";
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
    getKeys(@Token() token: TokenPayload): Promise<KeyEntity[]> {
        return this.keyService.getKeys(token.entity!.id);
    }

    /**
     * Get a specific key by ID
     * @param token
     * @param id
     * @returns
     */
    @Get(":id")
    getKey(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<KeyEntity> {
        return this.keyService.getKey(token.entity!.id, id);
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
        await this.cryptoService.updateCert(token.entity!.id, id, body);
    }

    /**
     * Delete a key from the key service.
     * @param token
     * @param id
     */
    @Delete(":id")
    deleteKey(@Token() token: TokenPayload, @Param("id") id: string) {
        return this.cryptoService.deleteKey(token.entity!.id, id);
    }
}
