import { Injectable, OnModuleInit } from '@nestjs/common';
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
    ) {
        this.uri =
            this.configService.getOrThrow('PUBLIC_URL') +
            '/status-management/status-list';
        this.file = join(
            this.configService.getOrThrow('KM_FOLDER'),
            'status-list.json',
        );
    }

    async onModuleInit() {
        await this.init();
    }

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
    createEntry(): JWTwithStatusListPayload {
        const file = this.getConfig();
        // get the last element from the stack
        const idx = file.stack.pop();
        //TODO: what to do if the stack is empty
        if (idx === undefined) {
            throw new Error('Stack for status list is empty!!!');
        }
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
    setEntry(id: number, value: number) {
        const file = this.getConfig();
        file.elements[id] = value;
        this.storeConfig(file);
        return this.createList();
    }
}
