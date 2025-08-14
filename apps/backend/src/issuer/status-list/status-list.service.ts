import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
    createHeaderAndPayload,
    JWTwithStatusListPayload,
    StatusList,
    StatusListJWTHeaderParameters,
} from "@sd-jwt/jwt-status-list";
import { JwtPayload } from "@sd-jwt/types";
import { join } from "path";
import { Repository } from "typeorm";
import { CryptoService } from "../../crypto/crypto.service";
import { Session } from "../../session/entities/session.entity";
import { StatusUpdateDto } from "./dto/status-update.dto";
import { StatusListEntity } from "./entities/status-list.entity";
import { StatusMapping } from "./entities/status-mapping.entity";

@Injectable()
export class StatusListService {
    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        @InjectRepository(StatusMapping)
        private statusMappingRepository: Repository<StatusMapping>,
        @InjectRepository(StatusListEntity)
        private statusListRepository: Repository<StatusListEntity>,
    ) {}

    /**
     * Initialize the status list service by checking if the status list file exists.
     * If it does not exist, create a new status list with 10,000 entries and a stack
     * of 10,000 indexes. The stack is shuffled to ensure randomness in the order of
     * entries. The status list is stored in the file system as a JSON file.
     */
    async onTenantInit(tenantId: string) {
        const size = 10000;
        // create an empty array with the size of 1000
        const elements = new Array(size).fill(0).map(() => 0);
        // create a list of 1000 indexes and shuffel them
        const stack = new Array(size)
            .fill(0)
            .map((_, i) => i)
            .sort(() => 0.5 - Math.random());

        const entry = await this.statusListRepository.save({
            tenantId,
            elements,
            stack,
            bits: 1,
        });

        await this.createList(entry);
    }

    /**
     * Create a new status list and stored it in the file
     */
    async createList(entry: StatusListEntity) {
        const list = new StatusList(entry.elements, entry.bits);
        const iss = `${this.configService.getOrThrow<string>("PUBLIC_URL")}`;

        const sub = join(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
            entry.tenantId,
            "status-management",
            "status-list",
        );

        const prePayload: JwtPayload = {
            iss,
            sub,
            iat: Math.floor(Date.now() / 1000),
        };
        const preHeader: StatusListJWTHeaderParameters = {
            alg: "ES256",
            typ: "statuslist+jwt",
            x5c: await this.cryptoService.getCertChain(
                "signing",
                entry.tenantId,
            ),
        };
        const { header, payload } = createHeaderAndPayload(
            list,
            prePayload,
            preHeader,
        );

        const jwt = await this.cryptoService.signJwt(
            header,
            payload,
            entry.tenantId,
        );
        await this.statusListRepository.update(
            { tenantId: entry.tenantId },
            { jwt },
        );
    }

    /**
     * Get the JWT for the status list of a tenant.
     * @param tenantId The ID of the tenant.
     * @returns The JWT for the status list.
     */
    getList(tenantId: string) {
        return this.statusListRepository
            .findOneByOrFail({ tenantId })
            .then((file) => file.jwt);
    }

    /**
     * Get the next free entry in the status list.
     * @returns
     */
    async createEntry(
        session: Session,
        credentialConfigurationId: string,
    ): Promise<JWTwithStatusListPayload> {
        const file = await this.statusListRepository.findOneByOrFail({
            tenantId: session.tenantId,
        });
        // get the last element from the stack
        const idx = file.stack.pop();
        //TODO: what to do if the stack is empty
        if (idx === undefined) {
            throw new Error("Stack for status list is empty!!!");
        }
        const sub = join(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
            session.tenantId,
            "status-management",
            "status-list",
        );
        // store the index in the status mapping
        await this.statusMappingRepository.save({
            sessionId: session.id,
            index: idx,
            list: sub,
            credentialConfigurationId,
        });

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
    private async setEntry(id: number, value: number, tenantId: string) {
        const entry = await this.statusListRepository.findOneByOrFail({
            tenantId,
        });
        entry.elements[id] = value;
        await this.statusListRepository.update(
            { tenantId },
            { elements: entry.elements },
        );
        return this.createList(entry);
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
