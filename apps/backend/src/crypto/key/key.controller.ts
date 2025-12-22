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
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { KeyEntity } from "./entities/keys.entity";
import { KeyService } from "./key.service";

/**
 * KeyController is responsible for managing keys in the system.
 */
@ApiTags("Key")
@Secured([Role.Issuances, Role.Presentations])
@Controller("key")
export class KeyController {
    constructor(@Inject("KeyService") public readonly keyService: KeyService) {}

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
        const id = await this.keyService.import(token.entity!.id, body);
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
        await this.keyService.update(token.entity!.id, id, body);
    }

    /**
     * Delete a key from the key service.
     * @param token
     * @param id
     */
    @Delete(":id")
    deleteKey(@Token() token: TokenPayload, @Param("id") id: string) {
        return this.keyService.deleteKey(token.entity!.id, id);
    }
}
