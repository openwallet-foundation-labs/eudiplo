import { randomInt } from "node:crypto";
import { join } from "node:path";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
    BitsPerStatus,
    createHeaderAndPayload,
    JWTwithStatusListPayload,
    StatusList,
    StatusListJWTHeaderParameters,
} from "@sd-jwt/jwt-status-list";
import { JwtPayload } from "@sd-jwt/types";
import { Repository } from "typeorm";
import { CertService } from "../../../crypto/key/cert/cert.service";
import { CertUsage } from "../../../crypto/key/entities/cert-usage.entity";
import { KeyService } from "../../../crypto/key/key.service";
import { Session } from "../../../session/entities/session.entity";
import { StatusUpdateDto } from "./dto/status-update.dto";
import { StatusListEntity } from "./entities/status-list.entity";
import { StatusMapping } from "./entities/status-mapping.entity";

@Injectable()
export class StatusListService {
    constructor(
        private readonly configService: ConfigService,
        private readonly certService: CertService,
        @Inject("KeyService") public readonly keyService: KeyService,
        @InjectRepository(StatusMapping)
        private readonly statusMappingRepository: Repository<StatusMapping>,
        @InjectRepository(StatusListEntity)
        private readonly statusListRepository: Repository<StatusListEntity>,
    ) {}

    /**
     * Cryptographically secure Fisher-Yates shuffle
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = randomInt(0, i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Create a new status list and store it in the file
     */
    async createNewList(tenantId: string) {
        const size = this.configService.getOrThrow<number>("STATUS_LENGTH");
        // create an empty array with the size of 1000
        const elements = new Array(size).fill(0).map(() => 0);
        // create a list of 1000 indexes and shuffle them using crypto-secure randomness
        const stack = this.shuffleArray(
            new Array(size).fill(0).map((_, i) => i),
        );

        const bits =
            this.configService.getOrThrow<BitsPerStatus>("STATUS_BITS");

        const entry = await this.statusListRepository.save({
            tenantId,
            elements,
            stack,
            bits,
        });

        await this.createListJWT(entry);
    }

    /**
     * Create a new status list and stored it in the file
     */
    async createListJWT(entry: StatusListEntity) {
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
        const cert = await this.certService.findOrCreate({
            tenantId: entry.tenantId,
            type: CertUsage.StatusList,
        });

        const preHeader: StatusListJWTHeaderParameters = {
            alg: "ES256",
            typ: "statuslist+jwt",
            x5c: this.certService.getCertChain(cert),
        };
        const { header, payload } = createHeaderAndPayload(
            list,
            prePayload,
            preHeader,
        );

        const jwt = await this.keyService.signJWT(
            payload,
            header,
            entry.tenantId,
            cert.keyId,
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

    hasStillFreeEntries(tenantId: string) {
        return this.statusListRepository
            .findOneByOrFail({ tenantId })
            .then((file) => {
                if (file.stack.length === 0) {
                    throw new ConflictException(
                        "No free entries left in the status list",
                    );
                } else {
                    return true;
                }
            });
    }

    /**
     * Get the next free entry in the status list.
     * @returns
     */
    async createEntry(
        session: Session,
        credentialConfigurationId: string,
    ): Promise<JWTwithStatusListPayload> {
        const file = await this.statusListRepository
            .findOneByOrFail({
                tenantId: session.tenantId,
            })
            //if none if found, create one
            .catch(() =>
                this.createNewList(session.tenantId).then(() =>
                    this.statusListRepository.findOneByOrFail({
                        tenantId: session.tenantId,
                    }),
                ),
            );
        // get the last element from the stack
        const idx = file.stack.pop();
        //TODO: what to do if the stack is empty
        if (idx === undefined) {
            throw new Error("Stack for status list is empty!!!");
        }
        const sub = `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${session.tenantId}/status-management/status-list`;
        // store the index in the status mapping
        await this.statusMappingRepository.save({
            tenantId: session.tenantId,
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
        return this.createListJWT(entry);
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
