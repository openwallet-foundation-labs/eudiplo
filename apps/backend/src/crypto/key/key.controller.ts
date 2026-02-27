import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from "@nestjs/common";
import {
    ApiExtraModels,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { KeyGenerateDto } from "./dto/key-generate.dto";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { KmsConfigDto } from "./dto/kms-config.dto";
import { KmsProvidersResponseDto } from "./dto/kms-providers-response.dto";
import { KeyEntity } from "./entities/keys.entity";
import { KeyService } from "./key.service";
import { KmsRegistry } from "./kms-registry.service";

/**
 * KeyController is responsible for managing keys in the system.
 */
@ApiExtraModels(KmsConfigDto)
@ApiTags("Key")
@Secured([Role.Issuances, Role.Presentations])
@Controller("key")
export class KeyController {
    constructor(
        private readonly keyService: KeyService,
        private readonly kmsRegistry: KmsRegistry,
    ) {}

    /**
     * Get all available KMS providers.
     * @returns List of available KMS provider names and the default.
     */
    @Get("providers")
    @ApiOperation({ summary: "List available KMS providers" })
    @ApiResponse({
        status: 200,
        description: "List of available KMS providers",
        type: KmsProvidersResponseDto,
    })
    getProviders(): KmsProvidersResponseDto {
        return {
            providers: this.kmsRegistry.getProviderInfoList(),
            default: this.kmsRegistry.getDefaultProviderName(),
        };
    }

    /**
     * Get all keys for the tenant.
     * @param token
     * @returns
     */
    @Get()
    @ApiOperation({ summary: "List all keys for the tenant" })
    @ApiResponse({ status: 200, type: [KeyEntity] })
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
    @ApiOperation({ summary: "Get a key by ID" })
    @ApiResponse({ status: 200, type: KeyEntity })
    getKey(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<KeyEntity> {
        return this.keyService.getKey(token.entity!.id, id);
    }

    /**
     * Generate a new key on the server (no private key upload required).
     * @param token
     * @param body
     */
    @Post("generate")
    @ApiOperation({ summary: "Generate a key on the server" })
    @ApiResponse({
        status: 201,
        description: "Key generated successfully",
    })
    async generateKey(
        @Token() token: TokenPayload,
        @Body() body: KeyGenerateDto,
    ): Promise<{ id: string }> {
        const id = await this.keyService.create(token.entity!.id, body);
        return { id };
    }

    /**
     * Add a new key to the key service.
     * @param token
     * @param body
     * @returns
     */
    @Post()
    @ApiOperation({ summary: "Import a key" })
    @ApiResponse({ status: 201, description: "Key imported successfully" })
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
    @ApiOperation({ summary: "Update key metadata" })
    @ApiResponse({ status: 200, description: "Key updated successfully" })
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
    @ApiOperation({ summary: "Delete a key" })
    @ApiResponse({ status: 200, description: "Key deleted successfully" })
    deleteKey(
        @Token() token: TokenPayload,
        @Param("id") id: string,
    ): Promise<void> {
        return this.keyService.deleteKey(token.entity!.id, id);
    }
}
