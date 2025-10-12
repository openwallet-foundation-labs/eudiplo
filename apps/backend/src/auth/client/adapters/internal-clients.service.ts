import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { randomBytes } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { Repository } from "typeorm";
import { Role } from "../../roles/role.enum";
import { ClientsProvider } from "../client.provider";
import { CreateClientDto } from "../dto/create-client.dto";
import { UpdateClientDto } from "../dto/update-client.dto";
import { ClientEntity } from "../entities/client.entity";

@Injectable()
export class InternalClientsProvider
    implements ClientsProvider, OnApplicationBootstrap
{
    constructor(
        private configService: ConfigService,
        private logger: PinoLogger,
        @InjectRepository(ClientEntity) private repo: Repository<ClientEntity>,
    ) {}

    async onApplicationBootstrap() {
        //add the root user

        const clientId = this.configService.getOrThrow("AUTH_CLIENT_ID");
        const clientSecret =
            this.configService.getOrThrow("AUTH_CLIENT_SECRET");
        await this.getClient("root", clientId).catch(() => {
            return this.repo.save({
                clientId,
                secret: clientSecret,
                description: "Internal client",
                roles: [Role.Tenants],
            });
        });

        return this.import();
    }

    async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const subfolder = "clients";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                let counter = 0;
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    const payload = JSON.parse(
                        readFileSync(join(path, file), "utf8"),
                    );

                    const clientExists = await this.getClient(
                        tenant.name,
                        `${tenant.name}-${payload.clientId}`,
                    ).catch(() => false);
                    if (clientExists && !force) {
                        continue; // Skip if config already exists and force is not set
                    } else if (clientExists && force) {
                        //delete old element so removed elements are not present
                        await this.repo.delete({
                            clientId: payload.clientId,
                            tenant: { id: tenant.name },
                        });
                    }

                    // Validate the payload against ClientEntity
                    const config = plainToClass(ClientEntity, payload);

                    const validationErrors = await validate(config, {
                        whitelist: true,
                        forbidUnknownValues: false, // avoid false positives on plain objects
                        forbidNonWhitelisted: false,
                        stopAtFirstError: false,
                    });

                    if (validationErrors.length > 0) {
                        this.logger.error(
                            {
                                event: "ValidationError",
                                file,
                                tenant: tenant.name,
                                errors: validationErrors.map((error) => ({
                                    property: error.property,
                                    constraints: error.constraints,
                                    value: error.value,
                                })),
                            },
                            `Validation failed for client config ${file} in tenant ${tenant.name}`,
                        );
                        continue; // Skip this invalid config
                    }
                    await this.addClient(tenant.name, config, payload.secret);
                    counter++;
                }
                this.logger.info(
                    {
                        event: "Import",
                    },
                    `${counter} client configs imported for ${tenant.name}`,
                );
            }
        }
    }

    getClients(tenantId: string) {
        return this.repo
            .find({ where: { tenant: { id: tenantId } } })
            .then((list) =>
                list.map((e) => ({
                    clientId: e.clientId,
                    description: e.description,
                    tenantId,
                    roles: e.roles,
                })),
            );
    }

    getClient(tenantId: string, clientId: string) {
        return this.repo
            .findOneByOrFail({ clientId, tenant: { id: tenantId } })
            .then((e) => ({
                clientId: e.clientId,
                description: e.description,
                tenantId,
                roles: e.roles,
            }));
    }

    getClientSecret(sub: string, id: string): Promise<string> {
        return this.repo
            .findOneByOrFail({ clientId: id, tenant: { id: sub } })
            .then((e) => e.secret!);
    }

    async addClient(
        tenantId: string,
        dto: CreateClientDto,
        secret = randomBytes(32).toString("hex"),
    ) {
        // we are adding the prefix because the clientId is not bound to tenant during login. This is relevant since not every tenant has it's own client database/iam system.
        dto.clientId = `${tenantId}-${dto.clientId}`;

        const entity = await this.repo.save({
            ...dto,
            secret,
            tenant: { id: tenantId },
        });
        return {
            clientId: entity.clientId,
            description: entity.description,
            tenantId,
            roles: entity.roles,
            clientSecret: secret,
        };
    }

    updateClient(
        tenantId: string,
        clientId: string,
        updateClientDto: UpdateClientDto,
    ) {
        return this.repo.update(
            { clientId, tenant: { id: tenantId } },
            updateClientDto,
        );
    }

    async removeClient(tenantId: string, clientId: string) {
        await this.repo.delete({ clientId, tenant: { id: tenantId } });
    }

    validateClientCredentials(clientId: string, clientSecret: string) {
        return this.repo.findOne({ where: { clientId, secret: clientSecret } });
    }
}
