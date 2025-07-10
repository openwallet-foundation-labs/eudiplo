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

interface StatusListFile {
    elements: number[];
    stack: number[];
    bits: BitsPerStatus;
    jwt?: string;
}

@Injectable()
export class StatusListService implements OnModuleInit {
    private file: string;
    private uri: string;

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        @InjectRepository(StatusMapping)
        private statusMappingRepository: Repository<StatusMapping>,
    ) {
        this.uri =
            this.configService.getOrThrow('PUBLIC_URL') +
            '/status-management/status-list';
        this.file = join(
            this.configService.getOrThrow('FOLDER'),
            'keys',
            'status-list.json',
        );
    }

    async onModuleInit() {
        await this.init();
    }

    /**
     * Initialize the status list service by checking if the status list file exists.
     * If it does not exist, create a new status list with 10,000 entries and a stack
     * of 10,000 indexes. The stack is shuffled to ensure randomness in the order of
     * entries. The status list is stored in the file system as a JSON file.
     */
    private async init() {
        if (!existsSync(this.file)) {
            const size = 10000;
            // create an empty array with the size of 1000
            const elements = new Array(size).fill(0).map(() => 0);
            // create a list of 1000 indexes and shuffel them
            const stack = new Array(size)
                .fill(0)
                .map((_, i) => i)
                .sort(() => 0.5 - Math.random());

            writeFileSync(
                this.file,
                JSON.stringify({ elements, stack, bits: 1 } as StatusListFile),
            );
            await this.createList();
        }
    }

    /**
     * Create a new status list and stored it in the file
     */
    async createList() {
        const file = this.getConfig();
        const list = new StatusList(file.elements, file.bits);
        const iss = `${this.configService.getOrThrow<string>('PUBLIC_URL')}`;

        const prePayload: JwtPayload = {
            iss,
            sub: this.uri,
            iat: Math.floor(Date.now() / 1000),
        };
        const preHeader: StatusListJWTHeaderParameters = {
            alg: 'ES256',
            typ: 'statuslist+jwt',
            x5c: this.cryptoService.getCertChain('signing'),
        };
        const { header, payload } = createHeaderAndPayload(
            list,
            prePayload,
            preHeader,
        );

        const jwt = await this.cryptoService.signJwt(header, payload);
        file.jwt = jwt;
        this.storeConfig(file);
    }

    getList() {
        return this.getConfig().jwt;
    }

    private getConfig() {
        return JSON.parse(readFileSync(this.file, 'utf-8')) as StatusListFile;
    }

    private storeConfig(content: StatusListFile) {
        writeFileSync(this.file, JSON.stringify(content));
    }

    /**
     * Get the next free entry in the status list
     * @returns
     */
    async createEntry(
        sessionId: string,
        credentialConfigurationId: string,
    ): Promise<JWTwithStatusListPayload> {
        const file = this.getConfig();
        // get the last element from the stack
        const idx = file.stack.pop();
        //TODO: what to do if the stack is empty
        if (idx === undefined) {
            throw new Error('Stack for status list is empty!!!');
        }
        // store the index in the status mapping
        await this.statusMappingRepository.save({
            sessionId,
            index: idx,
            list: this.uri,
            credentialConfigurationId,
        });
        this.storeConfig(file);
        return {
            status: {
                status_list: {
                    idx: idx,
                    uri: this.uri,
                },
            },
        };
    }

    /**
     * Update the value of an entry in the status list
     * @param id
     * @param value
     */
    private setEntry(id: number, value: number) {
        const file = this.getConfig();
        file.elements[id] = value;
        this.storeConfig(file);
        return this.createList();
    }

    /**
     * Update the status of a session and its credential configuration
     * @param value
     */
    async updateStatus(value: StatusUpdateDto) {
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
            await this.setEntry(entry.index, value.status);
        }
    }
}
