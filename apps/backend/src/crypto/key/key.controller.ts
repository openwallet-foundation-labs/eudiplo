import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Token, TokenPayload } from '../../auth/token.decorator';
import { CryptoService } from '../crypto.service';
import { KeyImportDto } from './dto/key-import.dto';
import { CertEntity } from './entities/cert.entity';
import { KeyService } from './key.service';

/**
 * KeyController is responsible for managing keys in the system.
 */
@UseGuards(JwtAuthGuard)
@ApiSecurity('oauth2')
@Controller('key')
export class KeyController {
    constructor(
        @Inject('KeyService') public readonly keyService: KeyService,
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
        const tenantId = token.sub;
        const id = await this.cryptoService.importKey(tenantId, body);
        return { id };
    }

    /**
     * Delete a key from the key service.
     * @param token
     * @param id
     */
    @Delete(':id')
    deleteKey(@Token() token: TokenPayload, @Param('id') id: string) {
        return this.cryptoService.deleteKey(token.sub, id);
    }
}
