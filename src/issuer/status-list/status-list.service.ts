import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
    BitsPerStatus,
    createHeaderAndPayload,
    JWTwithStatusListPayload,
    StatusList,
    StatusListJWTHeaderParameters,
} from '@sd-jwt/jwt-status-list';
import { JwtPayload } from '@sd-jwt/types';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../../crypto/crypto.service';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusMapping } from './entities/status-mapping.entity';
import { Repository } from 'typeorm';
import { StatusUpdateDto } from './dto/status-update.dto';
import { Session } from '../../session/entities/session.entity';

interface StatusListFile {
    elements: number[];
    stack: number[];
    bits: BitsPerStatus;
    jwt?: string;
}

@Injectable()
export class StatusListService implements OnModuleInit {
    private fileName: string = 'status-list.json';

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        @InjectRepository(StatusMapping)
        private statusMappingRepository: Repository<StatusMapping>,
    ) {}
    onModuleInit() {}

    onTenantInit(tenantId: string) {
        return this.init(tenantId);
    }

    /**
     * Initialize the status list service by checking if the status list file exists.
     * If it does not exist, create a new status list with 10,000 entries and a stack
     * of 10,000 indexes. The stack is shuffled to ensure randomness in the order of
     * entries. The status list is stored in the file system as a JSON file.
     */
    private async init(tenantId: string) {
        const file = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            this.fileName,
        );
        if (!existsSync(file)) {
            const size = 10000;
            // create an empty array with the size of 1000
            const elements = new Array(size).fill(0).map(() => 0);
            // create a list of 1000 indexes and shuffel them
            const stack = new Array(size)
                .fill(0)
                .map((_, i) => i)
                .sort(() => 0.5 - Math.random());

            writeFileSync(
                file,
                JSON.stringify({ elements, stack, bits: 1 } as StatusListFile),
            );
            await this.createList(tenantId);
        }
    }

    /**
     * Create a new status list and stored it in the file
     */
    async createList(tenantId: string) {
        const file = this.getConfig(tenantId);
        const list = new StatusList(file.elements, file.bits);
        const iss = `${this.configService.getOrThrow<string>('PUBLIC_URL')}`;

        const sub = join(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
            tenantId,
            'status-management',
            'status-list',
        );

        const prePayload: JwtPayload = {
            iss,
            sub,
            iat: Math.floor(Date.now() / 1000),
        };
        const preHeader: StatusListJWTHeaderParameters = {
            alg: 'ES256',
            typ: 'statuslist+jwt',
            x5c: await this.cryptoService.getCertChain('signing', tenantId),
        };
        const { header, payload } = createHeaderAndPayload(
            list,
            prePayload,
            preHeader,
        );

        const jwt = await this.cryptoService.signJwt(header, payload, tenantId);
        file.jwt = jwt;
        this.storeConfig(file, tenantId);
    }

    getList(tenantId: string) {
        return this.getConfig(tenantId).jwt;
    }

    private getConfig(tenantId: string) {
        const file = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            this.fileName,
        );
        return JSON.parse(readFileSync(file, 'utf-8')) as StatusListFile;
    }

    private storeConfig(content: StatusListFile, tenantId: string) {
        const file = join(
            this.configService.getOrThrow<string>('FOLDER'),
            tenantId,
            this.fileName,
        );
        writeFileSync(file, JSON.stringify(content));
    }

    /**
     * Get the next free entry in the status list
     * @returns
     */
    async createEntry(
        session: Session,
        credentialConfigurationId: string,
    ): Promise<JWTwithStatusListPayload> {
        const file = this.getConfig(session.tenantId);
        // get the last element from the stack
        const idx = file.stack.pop();
        //TODO: what to do if the stack is empty
        if (idx === undefined) {
            throw new Error('Stack for status list is empty!!!');
        }
        const sub = join(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
            session.tenantId,
            'status-management',
            'status-list',
        );
        // store the index in the status mapping
        await this.statusMappingRepository.save({
            sessionId: session.id,
            index: idx,
            list: sub,
            credentialConfigurationId,
        });
        this.storeConfig(file, session.tenantId);
        return {
            status: {
                status_list: {
                    idx: idx,
                    uri: sub,
                },
            },
        };
    }

    /**
     * Update the value of an entry in the status list
     * @param id
     * @param value
     */
    private setEntry(id: number, value: number, tenantId: string) {
        const file = this.getConfig(tenantId);
        file.elements[id] = value;
        this.storeConfig(file, tenantId);
        return this.createList(tenantId);
    }

    /**
     * Update the status of a session and its credential configuration
     * @param value
     */
    async updateStatus(value: StatusUpdateDto, tenantId: string) {
        const entries = await this.statusMappingRepository.findBy({
            sessionId: value.sessionId,
            credentialConfigurationId: value.credentialConfigurationId,
        });
        if (entries.length === 0) {
            throw new ConflictException(
                `No status mapping found for session ${value.sessionId} and credential configuration ${value.credentialConfigurationId}`,
            );
        }
        for (const entry of entries) {
            await this.setEntry(entry.index, value.status, tenantId);
        }
    }
}
